from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
import jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile

router = APIRouter(prefix="/market-map")

_STAGE_DISPLAY = {
    "pre-seed": "Pre-Seed",
    "seed": "Seed",
    "series-a": "Series A",
    "series-b": "Series B",
    "series-c": "Series C",
    "unknown": "Unknown",
}

def _normalize_stage(stage: str) -> str:
    key = stage.lower().strip().replace(" ", "-")
    return _STAGE_DISPLAY.get(key, stage.title())

@router.get("/")
async def get_market_map(request: Request, db: AsyncSession = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    user_id = None
    if auth_header.startswith("Bearer "):
        try:
            decoded = jwt.decode(auth_header[7:], options={"verify_signature": False}, algorithms=["RS256", "HS256"])
            user_id = decoded.get("sub")
            print(f"MARKET MAP: decoded user_id={user_id}")
        except Exception as e:
            print(f"MARKET MAP: jwt decode failed: {e}")
    else:
        print(f"MARKET MAP: no auth header found")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    profile_result = await db.execute(
        select(FirmProfile)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    profile = profile_result.scalars().first()
    top_match_threshold = (profile.notify_min_fit_score or 4) if profile else 4
    rows_result = await db.execute(
        select(Company, FirmCompanyScore)
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
    )
    rows = rows_result.fetchall()

    stage_counts = {}
    sector_counts = {}
    sector_fit_sum = {}
    sector_fit_count = {}
    fit_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    mandate_counts = {}
    mandate_fit_sum = {}
    mandate_fit_count = {}

    one_week_ago = datetime.utcnow() - timedelta(days=7)
    this_week_count = 0
    top_match_count = 0
    fit_score_sum = 0
    fit_score_count = 0

    for row in rows:
        company, score = row[0], row[1]
        # Stage
        if company.funding_stage:
            stage = _normalize_stage(company.funding_stage)
            stage_counts[stage] = stage_counts.get(stage, 0) + 1

        # Sector
        if company.sector:
            sector_counts[company.sector] = sector_counts.get(company.sector, 0) + 1
            if score.fit_score is not None:
                sector_fit_sum[company.sector] = sector_fit_sum.get(company.sector, 0) + score.fit_score
                sector_fit_count[company.sector] = sector_fit_count.get(company.sector, 0) + 1

        # Fit distribution
        if score.fit_score and score.fit_score in fit_distribution:
            fit_distribution[score.fit_score] += 1

        # Mandate category (firm-specific thesis buckets)
        if score.mandate_category:
            mandate_counts[score.mandate_category] = mandate_counts.get(score.mandate_category, 0) + 1
            if score.fit_score is not None:
                mandate_fit_sum[score.mandate_category] = mandate_fit_sum.get(score.mandate_category, 0) + score.fit_score
                mandate_fit_count[score.mandate_category] = mandate_fit_count.get(score.mandate_category, 0) + 1

        # Stats
        scraped = company.scraped_at.replace(tzinfo=None) if company.scraped_at else None
        if scraped and scraped >= one_week_ago:
            this_week_count += 1
        if score.fit_score and score.fit_score >= top_match_threshold:
            top_match_count += 1
        if score.fit_score is not None:
            fit_score_sum += score.fit_score
            fit_score_count += 1

    # Build sector data
    stage_data = [{"name": k, "value": v} for k, v in sorted(stage_counts.items(), key=lambda x: -x[1])]
    sector_sorted = sorted(sector_counts.items(), key=lambda x: -x[1])[:12]
    sector_data = []
    for name, value in sector_sorted:
        cnt = sector_fit_count.get(name, 0)
        total_fit = sector_fit_sum.get(name, 0)
        avg_fit = round(total_fit / cnt, 2) if cnt else None
        sector_data.append({"name": name, "value": value, "avg_fit": avg_fit})

    # Build mandate category data
    mandate_sorted = sorted(mandate_counts.items(), key=lambda x: -x[1])
    mandate_data = []
    for name, value in mandate_sorted:
        cnt = mandate_fit_count.get(name, 0)
        total_fit = mandate_fit_sum.get(name, 0)
        avg_fit = round(total_fit / cnt, 2) if cnt else None
        mandate_data.append({"name": name, "value": value, "avg_fit": avg_fit})

    # Fit distribution
    fit_data = [{"name": f"Score {k}", "value": v} for k, v in fit_distribution.items() if v > 0]

    # Summary stats
    total = len(rows)
    top_match_rate = round((top_match_count / total) * 100) if total else 0

    return {
        "total_companies": total,
        "this_week": this_week_count,
        "top_match_rate": top_match_rate,
        "avg_fit_score": round(fit_score_sum / fit_score_count, 1) if fit_score_count else 0,
        "stage_breakdown": stage_data,
        "sector_breakdown": sector_data,
        "mandate_breakdown": mandate_data,
        "fit_distribution": fit_data,
    }