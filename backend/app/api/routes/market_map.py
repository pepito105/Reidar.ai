from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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

    for s in startups:
        if s.funding_stage:
            stage_counts[s.funding_stage] = stage_counts.get(s.funding_stage, 0) + 1
        if s.sector:
            sector_counts[s.sector] = sector_counts.get(s.sector, 0) + 1
            if s.fit_score is not None:
                sector_fit_sum[s.sector] = sector_fit_sum.get(s.sector, 0) + s.fit_score
                sector_fit_count[s.sector] = sector_fit_count.get(s.sector, 0) + 1
        if s.fit_score and s.fit_score in fit_distribution:
            fit_distribution[s.fit_score] += 1

    stage_data = [{"name": k, "value": v} for k, v in sorted(stage_counts.items(), key=lambda x: -x[1])]
    sector_sorted = sorted(sector_counts.items(), key=lambda x: -x[1])[:12]
    sector_data = []
    for name, value in sector_sorted:
        cnt = sector_fit_count.get(name, 0)
        total_fit = sector_fit_sum.get(name, 0)
        avg_fit = round(total_fit / cnt, 2) if cnt else None
        sector_data.append({"name": name, "value": value, "avg_fit": avg_fit})
    fit_data = [{"name": f"Score {k}", "value": v} for k, v in fit_distribution.items() if v > 0]

    return {
        "total_companies": len(startups),
        "stage_breakdown": stage_data,
        "sector_breakdown": sector_data,
        "fit_distribution": fit_data,
    }
