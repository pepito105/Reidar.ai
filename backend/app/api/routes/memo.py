import os
import json
import uuid as _uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.core.config import settings
from anthropic import AsyncAnthropic

router = APIRouter(prefix="/memo")
logger = logging.getLogger(__name__)


def _user_id_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            decoded = jwt.decode(token, options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            return decoded.get("sub")
        except Exception:
            return None
    return None


def _to_uuid(s: str):
    try:
        return _uuid.UUID(s)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"Invalid ID format: {s}")


client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/tmp/radar_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def _extract_pdf_text(file_path: str) -> str:
    """Extract text from PDF using pypdf."""
    try:
        import pypdf
        reader = pypdf.PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text[:8000]  # limit to avoid token overflow
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""

async def _extract_file_text(file_path: str, filename: str) -> str:
    """Extract text from uploaded file."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return await _extract_pdf_text(file_path)
    elif ext in ["txt", "md"]:
        with open(file_path, "r", errors="ignore") as f:
            return f.read()[:8000]
    return ""


async def _get_score_and_company(startup_id: str, user_id: str, db: AsyncSession):
    """Load (Company, FirmCompanyScore) row by FirmCompanyScore.id."""
    score_uuid = _to_uuid(startup_id)
    row = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.id == score_uuid)
        .where(FirmCompanyScore.user_id == user_id)
    )
    return row.first()


@router.post("/upload/{startup_id}")
async def upload_file(
    startup_id: str,
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    user_id = _user_id_from_request(request)
    pair = await _get_score_and_company(startup_id, user_id, db)
    if not pair:
        raise HTTPException(status_code=404, detail="Startup not found")
    company, score = pair[0], pair[1]

    # Save file
    startup_dir = os.path.join(UPLOAD_DIR, startup_id)
    os.makedirs(startup_dir, exist_ok=True)

    safe_name = file.filename.replace(" ", "_")
    file_path = os.path.join(startup_dir, safe_name)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update memo_files on score
    files = list(score.memo_files or [])
    files = [f for f in files if f.get("name") != safe_name]
    files.append({
        "name": safe_name,
        "original_name": file.filename,
        "path": file_path,
        "size": len(contents),
        "uploaded_at": datetime.utcnow().isoformat() + "Z"
    })
    score.memo_files = files
    await db.commit()

    return {"success": True, "file": {"name": safe_name, "size": len(contents)}}


@router.delete("/file/{startup_id}/{filename}")
async def delete_file(
    startup_id: str,
    filename: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_id = _user_id_from_request(request)
    pair = await _get_score_and_company(startup_id, user_id, db)
    if not pair:
        raise HTTPException(status_code=404, detail="Startup not found")
    company, score = pair[0], pair[1]

    files = list(score.memo_files or [])
    file_to_delete = next((f for f in files if f.get("name") == filename), None)

    if file_to_delete:
        try:
            os.remove(file_to_delete["path"])
        except Exception:
            pass
        files = [f for f in files if f.get("name") != filename]
        score.memo_files = files
        await db.commit()

    return {"success": True}


async def generate_memo_for_startup(score: FirmCompanyScore, firm, db: AsyncSession, company: Company = None):
    """Generate memo text. Caller is responsible for saving score.memo and committing."""
    file_context = ""
    for f in (score.memo_files or []):
        text = await _extract_file_text(f["path"], f["name"])
        if text:
            file_context += f"\n\n--- Document: {f['original_name']} ---\n{text}"

    firm_context = ""
    if firm:
        firm_context = f"Firm: {firm.firm_name}\nThesis: {firm.investment_thesis}"

    # Merge global and firm fields
    name = company.name if company else "Unknown"
    one_liner = company.enriched_one_liner or company.one_liner if company else score.recommended_next_step or ""
    website = company.website if company else None
    funding_stage = company.funding_stage if company else None
    funding_amount = company.funding_amount_usd if company else None
    top_investors = company.top_investors if company else []
    sector = company.sector if company else None
    business_model = company.business_model if company else None
    target_customer = company.target_customer if company else None
    traction_signals = company.traction_signals if company else None
    red_flags = score.red_flags
    fit_score = score.fit_score
    fit_reasoning = score.fit_reasoning
    bull_case = score.bull_case
    key_risks = score.key_risks
    recommended_next_step = score.recommended_next_step
    notes = score.notes

    prompt = f"""You are a senior investment analyst writing a formal investment memo for a partner meeting.

{firm_context}

IMPORTANT CONTEXT:
This memo is generated AFTER deep research has already been completed on this company.
Use all the enriched data below. Do not be generic — every section should reference
specific findings from the research.

RESEARCH DATA:
Name: {name}
One-liner: {one_liner}
Website: {website or "Unknown"}
Stage: {funding_stage or "Unknown"}
Funding: {(str(round(funding_amount/1000000, 1)) + "M raised") if funding_amount else "Unknown"}
Investors: {", ".join(top_investors or []) or "Unknown"}
Sector: {sector or "Unknown"}
Business Model: {business_model or "Unknown"}
Target Customer: {target_customer or "Unknown"}
Traction Signals: {traction_signals or "Unknown"}
Red Flags: {red_flags or "None identified"}
Thesis Fit Score: {fit_score}/5
Thesis Fit Reasoning: {fit_reasoning or ""}
Bull Case: {bull_case or ""}
Key Risks: {key_risks or ""}
Recommended Next Step: {recommended_next_step or ""}
{f"Analyst Notes: {notes}" if notes else ""}
{file_context}

Write a concise investment memo with exactly these sections. Use markdown headers (##).
Write in the voice of a senior analyst presenting to partners. Direct, specific, no filler.

## Executive Summary
2-3 sentences. What they do, why it matters now, clear recommendation.

## What They Do
Concrete product description based on research. Avoid repeating their marketing language.
What does the product literally do today?

## Why Now
Specific market timing thesis. What changed that makes this the right moment?

## Traction & Validation
Evidence of real progress — customers, revenue signals, team growth, press.
Be specific. No vague claims.

## Team
Founder-market fit assessment. Prior outcomes. Why these founders?

## Competitive Landscape
Top competitors and how this company differentiates. Is the moat durable?

## Risks
Top 3 risks with honest assessment. Don't soften them.

## Thesis Fit
Why this does or doesn't fit the firm's specific mandate. Score: {fit_score}/5.
Reference the firm's thesis explicitly.

## Recommendation
{recommended_next_step or "Clear action: Pass / Monitor / Request Intro / Move to Diligence."}
One sentence rationale tied to mandate.

One page maximum. Be direct."""

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text.strip()
    except Exception as e:
        logger.error(f"Memo generation error: {e}")
        return None


@router.post("/generate/{startup_id}")
async def generate_memo(
    startup_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user_id = _user_id_from_request(request)
    pair = await _get_score_and_company(startup_id, user_id, db)
    if not pair:
        raise HTTPException(status_code=404, detail="Startup not found")
    company, score = pair[0], pair[1]

    firm_result = await db.execute(
        select(FirmProfile).where(FirmProfile.user_id == user_id).where(FirmProfile.is_active == True).limit(1)
    )
    firm = firm_result.scalars().first()

    memo_text = await generate_memo_for_startup(score, firm, db, company=company)
    if not memo_text:
        raise HTTPException(status_code=500, detail="Memo generation failed")

    score.memo = memo_text
    score.memo_generated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(score)
    return {
        "success": True,
        "memo": memo_text,
        "generated_at": (score.memo_generated_at.isoformat() + "Z") if score.memo_generated_at else None,
        "bull_case": score.bull_case or None,
        "key_risks": score.key_risks or None,
    }


@router.get("/{startup_id}")
async def get_memo(startup_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    pair = await _get_score_and_company(startup_id, user_id, db)
    if not pair:
        raise HTTPException(status_code=404, detail="Startup not found")
    company, score = pair[0], pair[1]
    return {
        "memo": score.memo,
        "memo_files": score.memo_files or [],
        "memo_generated_at": (score.memo_generated_at.isoformat() + "Z") if score.memo_generated_at else None,
        "bull_case": score.bull_case or None,
        "key_risks": score.key_risks or None,
    }
