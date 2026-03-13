import os
import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.startup import Startup
from app.models.firm_profile import FirmProfile
from app.core.config import settings
from anthropic import AsyncAnthropic

router = APIRouter(prefix="/memo")
logger = logging.getLogger(__name__)
client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

UPLOAD_DIR = "/Users/remibalassanian/radar/uploads"

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

@router.post("/upload/{startup_id}")
async def upload_file(
    startup_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    # Save file
    startup_dir = os.path.join(UPLOAD_DIR, str(startup_id))
    os.makedirs(startup_dir, exist_ok=True)
    
    safe_name = file.filename.replace(" ", "_")
    file_path = os.path.join(startup_dir, safe_name)
    
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Update memo_files
    files = list(startup.memo_files or [])
    # Remove existing file with same name
    files = [f for f in files if f.get("name") != safe_name]
    files.append({
        "name": safe_name,
        "original_name": file.filename,
        "path": file_path,
        "size": len(contents),
        "uploaded_at": datetime.now().isoformat()
    })
    startup.memo_files = files
    await db.commit()

    return {"success": True, "file": {"name": safe_name, "size": len(contents)}}

@router.delete("/file/{startup_id}/{filename}")
async def delete_file(
    startup_id: int,
    filename: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    files = list(startup.memo_files or [])
    file_to_delete = next((f for f in files if f.get("name") == filename), None)
    
    if file_to_delete:
        try:
            os.remove(file_to_delete["path"])
        except:
            pass
        files = [f for f in files if f.get("name") != filename]
        startup.memo_files = files
        await db.commit()

    return {"success": True}

@router.post("/generate/{startup_id}")
async def generate_memo(
    startup_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")

    firm_result = await db.execute(select(FirmProfile).where(FirmProfile.is_active == True).limit(1))
    firm = firm_result.scalar_one_or_none()

    # Extract text from uploaded files
    file_context = ""
    for f in (startup.memo_files or []):
        text = await _extract_file_text(f["path"], f["name"])
        if text:
            file_context += f"\n\n--- Document: {f['original_name']} ---\n{text}"

    firm_context = ""
    if firm:
        firm_context = f"Firm: {firm.firm_name}\nThesis: {firm.investment_thesis}"

    prompt = f"""You are a senior investment analyst writing a formal investment memo.

{firm_context}

COMPANY DATA:
Name: {startup.name}
One-liner: {startup.one_liner}
Website: {startup.website or "Unknown"}
Stage: {startup.funding_stage or "Unknown"}
Funding: {(str(round(startup.funding_amount_usd/1000000, 1)) + "M raised") if startup.funding_amount_usd else "Unknown"}
Investors: {", ".join(startup.top_investors or []) or "Unknown"}
Sector: {startup.sector or "Unknown"}
Business Model: {startup.business_model or "Unknown"}
Target Customer: {startup.target_customer or "Unknown"}
Team Size: {startup.team_size or "Unknown"}
Traction: {startup.notable_traction or "Unknown"}
AI Score: {startup.ai_score}/5
Thesis Fit Score: {startup.fit_score}/5
Thesis Fit Reasoning: {startup.fit_reasoning or ""}
Thesis Tags: {", ".join(startup.thesis_tags or [])}
Recommended Next Step: {startup.recommended_next_step or ""}
{f"Analyst Notes: {startup.notes}" if startup.notes else ""}
{f"Bull Case: {startup.bull_case}" if startup.bull_case else ""}
{f"Key Risks: {startup.key_risks}" if startup.key_risks else ""}
{file_context}

Write a concise but thorough investment memo with exactly these sections. Use markdown headers (##):

## Executive Summary
2-3 sentences. What they do, why it matters, investment recommendation.

## Market Opportunity
Size of the market, why now, tailwinds.

## Product & Technology
What they've built, how it works, AI-nativeness, moat.

## Business Model
Revenue model, pricing, unit economics if known.

## Traction & Signals
What evidence exists of product-market fit.

## Team
What we know about the founding team, relevant background.

## Competitive Landscape
Key competitors, differentiation, defensibility.

## Risks
Top 3 risks. Be honest.

## Thesis Fit
Why this does or doesn't fit the firm's investment mandate. Score: {startup.fit_score}/5.

## Recommendation
Clear action: Pass / Monitor / Request Intro / Move to Diligence. One sentence rationale.

Be direct, specific, and analytical. Avoid generic VC language."""

    try:
        response = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        memo_text = response.content[0].text.strip()
        startup.memo = memo_text
        startup.memo_generated_at = datetime.now()
        await db.commit()
        await db.refresh(startup)
        return {
            "success": True,
            "memo": memo_text,
            "generated_at": startup.memo_generated_at.isoformat() if startup.memo_generated_at else None,
            "bull_case": startup.bull_case or None,
            "key_risks": startup.key_risks or None,
        }
    except Exception as e:
        logger.error(f"Memo generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Memo generation failed: {str(e)}")

@router.get("/{startup_id}")
async def get_memo(startup_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Startup).where(Startup.id == startup_id))
    startup = result.scalar_one_or_none()
    if not startup:
        raise HTTPException(status_code=404, detail="Startup not found")
    return {
        "memo": startup.memo,
        "memo_files": startup.memo_files or [],
        "memo_generated_at": startup.memo_generated_at.isoformat() if startup.memo_generated_at else None,
        "bull_case": startup.bull_case or None,
        "key_risks": startup.key_risks or None,
    }
