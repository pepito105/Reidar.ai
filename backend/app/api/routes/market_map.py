from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.startup import Startup

router = APIRouter(prefix="/market-map")

@router.get("/")
async def get_market_map(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Startup))
    startups = result.scalars().all()

    stage_counts = {}
    sector_counts = {}
    sector_fit_sum = {}
    sector_fit_count = {}
    fit_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    mandate_counts = {}
    mandate_fit_sum = {}
    mandate_fit_count = {}

    one_week_ago = datetime.now() - timedelta(days=7)
    this_week_count = 0
    top_match_count = 0
    ai_score_sum = 0
    ai_score_count = 0

    for s in startups:
        # Stage
        if s.funding_stage:
            stage_counts[s.funding_stage] = stage_counts.get(s.funding_stage, 0) + 1

        # Sector
        if s.sector:
            sector_counts[s.sector] = sector_counts.get(s.sector, 0) + 1
            if s.fit_score is not None:
                sector_fit_sum[s.sector] = sector_fit_sum.get(s.sector, 0) + s.fit_score
                sector_fit_count[s.sector] = sector_fit_count.get(s.sector, 0) + 1

        # Fit distribution
        if s.fit_score and s.fit_score in fit_distribution:
            fit_distribution[s.fit_score] += 1

        # Mandate category (firm-specific thesis buckets)
        if s.mandate_category:
            mandate_counts[s.mandate_category] = mandate_counts.get(s.mandate_category, 0) + 1
            if s.fit_score is not None:
                mandate_fit_sum[s.mandate_category] = mandate_fit_sum.get(s.mandate_category, 0) + s.fit_score
                mandate_fit_count[s.mandate_category] = mandate_fit_count.get(s.mandate_category, 0) + 1

        # Stats
        scraped = s.scraped_at.replace(tzinfo=None) if s.scraped_at else None
        if scraped and scraped >= one_week_ago:
            this_week_count += 1
        if s.fit_score and s.fit_score >= 5:
            top_match_count += 1
        if s.ai_score is not None:
            ai_score_sum += s.ai_score
            ai_score_count += 1

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
    total = len(startups)
    top_match_rate = round((top_match_count / total) * 100) if total else 0
    avg_ai_score = round(ai_score_sum / ai_score_count, 1) if ai_score_count else 0

    return {
        "total_companies": total,
        "this_week": this_week_count,
        "top_match_rate": top_match_rate,
        "avg_ai_score": avg_ai_score,
        "stage_breakdown": stage_data,
        "sector_breakdown": sector_data,
        "mandate_breakdown": mandate_data,
        "fit_distribution": fit_data,
    }