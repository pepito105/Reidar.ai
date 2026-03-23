import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, update, distinct, or_, and_

from app.core.database import get_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.firm_profile import FirmProfile
from app.models.scheduler_run import SchedulerRun
from app.models.signal import CompanySignal
from app.models.sourcing_history import SourcingHistory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


def _user_id_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            decoded = jwt.decode(
                token,
                options={"verify_signature": False},
                algorithms=["RS256", "HS256"],
            )
            return decoded.get("sub")
        except Exception:
            return None
    return None


def _mandate_status(count: int) -> str:
    if count <= 2:
        return "thin"
    if count <= 9:
        return "moderate"
    return "saturated"


def _sourcing_summary(job_name: str, stats: Optional[dict], error_message: Optional[str], status: str) -> str:
    if status == "failure":
        return error_message or "Job failed"
    if not stats:
        if job_name == "autonomous_sourcing":
            return "Sourcing run completed"
        if job_name == "signal_refresh":
            return "Signal refresh completed"
        if job_name == "weekly_summary":
            return "Weekly summary email sent"
        if job_name == "research_batch":
            return "Research batch completed"
        return "Job completed"
    if job_name == "autonomous_sourcing":
        qc = stats.get("queries_generated", stats.get("query_count", 0))
        cf = stats.get("companies_found", 0)
        hf = stats.get("high_fit_count", 0)
        return f"Ran {qc} queries — found {cf} companies, {hf} matched your mandate"
    if job_name == "signal_refresh":
        cc = stats.get("total_refreshed", 0)
        sf = stats.get("total_signals", 0)
        return f"Checked {cc} companies — {sf} new signals detected"
    if job_name == "weekly_summary":
        return "Weekly summary email sent"
    return "Job completed"


# ── Endpoint 1: Sourcing intelligence ────────────────────────────────────────

@router.get("/sourcing")
async def get_sourcing_intelligence(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)

    # All history for this user, last 30 days for trend
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    history_result = await db.execute(
        select(SourcingHistory)
        .where(SourcingHistory.user_id == user_id)
        .order_by(SourcingHistory.ran_at.desc())
        .limit(200)
    )
    all_rows = history_result.scalars().all()

    # Last run: rows sharing the most recent ran_at timestamp
    last_run_data = {
        "ran_at": None, "query_count": 0, "companies_found": 0,
        "companies_added": 0, "high_fit_count": 0, "avg_quality": 0.0,
    }
    last_run_queries = []

    if all_rows:
        max_ran_at = all_rows[0].ran_at
        last_batch = [r for r in all_rows if r.ran_at.replace(microsecond=0) == max_ran_at.replace(microsecond=0)]
        qualities = [r.quality_score for r in last_batch if r.quality_score is not None]
        last_run_data = {
            "ran_at": max_ran_at.isoformat() + "Z" if max_ran_at else None,
            "query_count": len(last_batch),
            "companies_found": sum(r.companies_extracted or 0 for r in last_batch),
            "companies_added": sum(r.new_companies_added or 0 for r in last_batch),
            "high_fit_count": sum(r.high_fit_count or 0 for r in last_batch),
            "avg_quality": round(sum(qualities) / len(qualities), 3) if qualities else 0.0,
        }
        last_run_queries = [
            {
                "query": r.query,
                "quality_score": r.quality_score,
                "companies_added": r.new_companies_added or 0,
                "high_fit_count": r.high_fit_count or 0,
            }
            for r in last_batch
        ]

    # Quality trend: group by ran_at, average quality, last 14 distinct timestamps
    recent_rows = [r for r in all_rows if r.ran_at >= thirty_days_ago]
    by_ran_at: dict = {}
    for r in recent_rows:
        key = r.ran_at
        if key not in by_ran_at:
            by_ran_at[key] = []
        if r.quality_score is not None:
            by_ran_at[key].append(r.quality_score)

    sorted_timestamps = sorted(by_ran_at.keys())[-14:]
    quality_trend = [
        {
            "ran_at": ts.isoformat() + "Z",
            "avg_quality": round(sum(by_ran_at[ts]) / len(by_ran_at[ts]), 3) if by_ran_at[ts] else 0.0,
        }
        for ts in sorted_timestamps
    ]

    # Mandate coverage
    mandate_result = await db.execute(
        select(FirmCompanyScore.mandate_category, func.count(FirmCompanyScore.id).label("cnt"))
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.mandate_category.isnot(None))
        .where(FirmCompanyScore.mandate_category != "")
        .group_by(FirmCompanyScore.mandate_category)
        .order_by(func.count(FirmCompanyScore.id).asc())
    )
    mandate_coverage = [
        {"bucket": row.mandate_category, "count": row.cnt, "status": _mandate_status(row.cnt)}
        for row in mandate_result.all()
    ]

    return {
        "last_run": last_run_data,
        "quality_trend": quality_trend,
        "last_run_queries": last_run_queries,
        "mandate_coverage": mandate_coverage,
    }


# ── Endpoint 2: Coverage intelligence ────────────────────────────────────────

@router.get("/coverage")
async def get_coverage_intelligence(request: Request, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import or_
    user_id = _user_id_from_request(request)

    base_filter = (
        select(FirmCompanyScore, Company)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
    )

    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(FirmCompanyScore)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
    )
    total = count_result.scalar() or 0

    # Fit distribution
    dist_result = await db.execute(
        select(FirmCompanyScore.fit_score, func.count(FirmCompanyScore.id).label("cnt"))
        .where(FirmCompanyScore.user_id == user_id)
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
        .where(FirmCompanyScore.fit_score.isnot(None))
        .group_by(FirmCompanyScore.fit_score)
    )
    fit_distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for row in dist_result.all():
        if row.fit_score is not None and 1 <= row.fit_score <= 5:
            fit_distribution[str(row.fit_score)] = row.cnt

    # By mandate bucket
    mandate_result = await db.execute(
        select(
            FirmCompanyScore.mandate_category,
            func.count(FirmCompanyScore.id).label("cnt"),
            func.avg(FirmCompanyScore.fit_score).label("avg_fit"),
        )
        .where(FirmCompanyScore.user_id == user_id)
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
        .where(FirmCompanyScore.mandate_category.isnot(None))
        .where(FirmCompanyScore.mandate_category != "")
        .group_by(FirmCompanyScore.mandate_category)
        .order_by(func.count(FirmCompanyScore.id).desc())
    )
    by_mandate = [
        {
            "bucket": row.mandate_category,
            "count": row.cnt,
            "avg_fit": round(float(row.avg_fit), 2) if row.avg_fit is not None else None,
            "status": _mandate_status(row.cnt),
        }
        for row in mandate_result.all()
    ]

    # By sector
    sector_result = await db.execute(
        select(Company.sector, func.count(FirmCompanyScore.id).label("cnt"))
        .join(FirmCompanyScore, FirmCompanyScore.company_id == Company.id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(or_(FirmCompanyScore.is_portfolio == False, FirmCompanyScore.is_portfolio.is_(None)))
        .where(Company.sector.isnot(None))
        .group_by(Company.sector)
        .order_by(func.count(FirmCompanyScore.id).desc())
        .limit(20)
    )
    by_sector = [{"sector": row.sector, "count": row.cnt} for row in sector_result.all()]

    # fit_threshold from firm profile
    profile_result = await db.execute(
        select(FirmProfile.fit_threshold)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    fit_threshold = profile_result.scalar() or 3

    return {
        "total_companies": total,
        "fit_distribution": fit_distribution,
        "by_mandate_bucket": by_mandate,
        "by_sector": by_sector,
        "fit_threshold": fit_threshold,
    }


# ── Endpoint 3: Signal intelligence ──────────────────────────────────────────

@router.get("/signals")
async def get_signal_intelligence(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # Monitored companies
    monitored_result = await db.execute(
        select(FirmCompanyScore, Company)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.pipeline_status.in_(["watching", "outreach", "diligence"]))
        .order_by(Company.name.asc())
    )
    monitored_rows = monitored_result.all()

    monitored_company_ids = [score.company_id for score, _ in monitored_rows]

    # All signals for monitored companies
    signals_map: dict = {}  # company_id → list of CompanySignal rows
    if monitored_company_ids:
        signals_result = await db.execute(
            select(CompanySignal)
            .where(CompanySignal.company_id.in_(monitored_company_ids))
            .order_by(CompanySignal.detected_at.desc())
        )
        for sig in signals_result.scalars().all():
            cid = sig.company_id
            if cid not in signals_map:
                signals_map[cid] = []
            signals_map[cid].append(sig)

    monitored_companies = []
    for score, company in monitored_rows:
        sigs = signals_map.get(score.company_id, [])
        recent = [s for s in sigs if s.detected_at and s.detected_at >= seven_days_ago]
        signal_types = list(dict.fromkeys(s.signal_type for s in sigs if s.signal_type))
        monitored_companies.append({
            "company_id": str(company.id),
            "company_name": company.name,
            "pipeline_status": score.pipeline_status,
            "last_refreshed_at": (score.last_refreshed_at.isoformat() + "Z") if score.last_refreshed_at else None,
            "signal_count": len(sigs),
            "recent_signal_count": len(recent),
            "signal_types": signal_types,
        })

    # Last signal_refresh scheduler run
    last_run_result = await db.execute(
        select(SchedulerRun)
        .where(SchedulerRun.job_name == "signal_refresh")
        .where(SchedulerRun.status == "success")
        .order_by(SchedulerRun.completed_at.desc())
        .limit(1)
    )
    last_run_row = last_run_result.scalar_one_or_none()
    last_run = {
        "ran_at": (last_run_row.completed_at.isoformat() + "Z") if last_run_row and last_run_row.completed_at else None,
        "companies_checked": (last_run_row.stats or {}).get("total_refreshed", 0) if last_run_row else 0,
        "signals_found": (last_run_row.stats or {}).get("total_signals", 0) if last_run_row else 0,
    }

    # Signal type breakdown across all monitored companies
    breakdown = {"funding": 0, "product": 0, "hiring": 0, "press": 0, "other": 0}
    for sigs in signals_map.values():
        for s in sigs:
            st = (s.signal_type or "other").lower()
            if st in breakdown:
                breakdown[st] += 1
            else:
                breakdown["other"] += 1

    return {
        "monitored_companies": monitored_companies,
        "last_run": last_run,
        "signal_type_breakdown": breakdown,
    }


# ── Endpoint 4: Learning intelligence ────────────────────────────────────────

@router.get("/learning")
async def get_learning_intelligence(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    history_result = await db.execute(
        select(SourcingHistory)
        .where(SourcingHistory.user_id == user_id)
        .where(SourcingHistory.ran_at >= thirty_days_ago)
        .order_by(SourcingHistory.quality_score.desc())
    )
    rows = history_result.scalars().all()

    high_performing = [
        {"query": r.query, "quality_score": r.quality_score, "ran_at": r.ran_at.isoformat() + "Z"}
        for r in rows if r.quality_score is not None and r.quality_score >= 0.6
    ]
    low_performing = [
        {"query": r.query, "quality_score": r.quality_score, "ran_at": r.ran_at.isoformat() + "Z"}
        for r in rows
        if r.quality_score is not None and r.quality_score < 0.2 and (r.results_count or 0) > 0
    ]

    total_runs_result = await db.execute(
        select(func.count(distinct(SourcingHistory.ran_at)))
        .where(SourcingHistory.user_id == user_id)
        .where(SourcingHistory.ran_at >= thirty_days_ago)
    )
    total_runs = total_runs_result.scalar() or 0

    hp_count = len(high_performing)
    if total_runs == 0:
        loop_status = "cold_start"
    elif total_runs < 10:
        loop_status = "learning"
    else:
        loop_status = "self_optimizing"

    return {
        "high_performing": high_performing,
        "low_performing": low_performing,
        "loop_status": loop_status,
        "high_performing_count": hp_count,
        "total_runs": total_runs,
        "runs_until_optimizing": max(0, 10 - total_runs),
    }


# ── Endpoint 5: Teach a query ─────────────────────────────────────────────────

@router.post("/learning/teach")
async def teach_query(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    query = (payload.get("query") or "").strip()
    if not query:
        return {"success": False, "query": ""}

    db.add(SourcingHistory(
        user_id=user_id,
        query=query,
        quality_score=0.8,
        results_count=0,
        urls_found=0,
        companies_extracted=0,
        new_companies_added=0,
        high_fit_count=0,
        ran_at=datetime.utcnow(),
    ))
    await db.commit()
    return {"success": True, "query": query}


# ── Endpoint 5b: Query feedback ───────────────────────────────────────────────

@router.post("/sourcing/query-feedback")
async def sourcing_query_feedback(payload: dict, request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    query = (payload.get("query") or "").strip()
    signal = payload.get("signal", "")
    if not query or signal not in ("good", "bad"):
        return {"success": False, "query": query, "signal": signal}

    if signal == "good":
        quality_score = 0.8
        results_count = 0
        dup_check = (
            select(SourcingHistory.id)
            .where(SourcingHistory.user_id == user_id)
            .where(SourcingHistory.query == query)
            .where(SourcingHistory.quality_score >= 0.6)
            .limit(1)
        )
    else:
        # results_count=1 so this qualifies as low-performing in the learning loop
        # (low_performing filter: quality < 0.2 AND results_count > 0)
        quality_score = 0.0
        results_count = 1
        dup_check = (
            select(SourcingHistory.id)
            .where(SourcingHistory.user_id == user_id)
            .where(SourcingHistory.query == query)
            .where(SourcingHistory.quality_score == 0.0)
            .limit(1)
        )

    existing = await db.execute(dup_check)
    if existing.scalars().first() is not None:
        return {"success": True, "query": query, "signal": signal, "already_recorded": True}

    db.add(SourcingHistory(
        user_id=user_id,
        query=query,
        quality_score=quality_score,
        results_count=results_count,
        urls_found=0,
        companies_extracted=0,
        new_companies_added=0,
        high_fit_count=0,
        ran_at=datetime.utcnow(),
    ))
    await db.commit()
    return {"success": True, "query": query, "signal": signal, "already_recorded": False}


# ── Endpoint 6: Reset learning history ───────────────────────────────────────

@router.post("/learning/reset")
async def reset_learning(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)

    count_result = await db.execute(
        select(func.count()).select_from(SourcingHistory)
        .where(SourcingHistory.user_id == user_id)
    )
    total = count_result.scalar() or 0

    await db.execute(
        delete(SourcingHistory).where(SourcingHistory.user_id == user_id)
    )
    await db.commit()
    return {"deleted": total}


# ── Endpoint 7: Portfolio intelligence ───────────────────────────────────────

@router.get("/portfolio")
async def get_portfolio_intelligence(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)

    portfolio_result = await db.execute(
        select(FirmCompanyScore, Company)
        .join(Company, Company.id == FirmCompanyScore.company_id)
        .where(FirmCompanyScore.user_id == user_id)
        .where(FirmCompanyScore.is_portfolio == True)
        .order_by(Company.name.asc())
    )
    portfolio_rows = portfolio_result.all()

    portfolio_companies = [
        {
            "company_id": str(company.id),
            "company_name": company.name,
            "website": company.website,
            "pipeline_status": score.pipeline_status,
            "is_portfolio": True,
        }
        for score, company in portfolio_rows
    ]

    profile_result = await db.execute(
        select(FirmProfile.excluded_sectors)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    excluded_sectors = profile_result.scalar() or []

    return {
        "portfolio_companies": portfolio_companies,
        "excluded_sectors": excluded_sectors if isinstance(excluded_sectors, list) else [],
        "portfolio_count": len(portfolio_companies),
    }


# ── Endpoint 8: Update portfolio flag ────────────────────────────────────────

@router.patch("/portfolio/{company_id}")
async def update_portfolio_flag(
    company_id: str,
    payload: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user_id = _user_id_from_request(request)

    try:
        company_uuid = uuid.UUID(company_id)
    except ValueError:
        return {"success": False, "error": "Invalid company_id"}

    is_portfolio = payload.get("is_portfolio")
    if is_portfolio is None:
        return {"success": False, "error": "is_portfolio required"}

    new_pipeline_status = "invested" if is_portfolio else "none"

    result = await db.execute(
        select(FirmCompanyScore)
        .where(FirmCompanyScore.company_id == company_uuid)
        .where(FirmCompanyScore.user_id == user_id)
        .limit(1)
    )
    score = result.scalar_one_or_none()
    if not score:
        return {"success": False, "error": "Company not found"}

    score.is_portfolio = is_portfolio
    score.pipeline_status = new_pipeline_status
    await db.commit()
    return {"success": True}


# ── Endpoint 9: Overnight run history ────────────────────────────────────────

_JOB_DISPLAY_NAMES = {
    "autonomous_sourcing": "Sourcing",
    "signal_refresh": "Signal Refresh",
    "weekly_summary": "Weekly Summary",
    "nightly_scrape": "Nightly Scrape",
    "research_batch": "Research Batch",
}


@router.get("/overnight")
async def get_overnight_history(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    runs_result = await db.execute(
        select(SchedulerRun)
        .where(SchedulerRun.started_at >= seven_days_ago)
        .where(SchedulerRun.job_name.in_(["autonomous_sourcing", "signal_refresh", "weekly_summary"]))
        .where(or_(
            SchedulerRun.user_id == user_id,
            and_(SchedulerRun.user_id.is_(None), SchedulerRun.started_at >= seven_days_ago),
        ))
        .order_by(SchedulerRun.started_at.desc())
    )
    runs = runs_result.scalars().all()

    # Group by UTC date
    by_date: dict = {}
    for run in runs:
        date_key = run.started_at.strftime("%Y-%m-%d") if run.started_at else "unknown"
        if date_key not in by_date:
            by_date[date_key] = []
        duration = None
        if run.started_at and run.completed_at:
            duration = int((run.completed_at - run.started_at).total_seconds())
        by_date[date_key].append({
            "job_name": run.job_name,
            "display_name": _JOB_DISPLAY_NAMES.get(run.job_name, run.job_name),
            "started_at": (run.started_at.isoformat() + "Z") if run.started_at else None,
            "completed_at": (run.completed_at.isoformat() + "Z") if run.completed_at else None,
            "duration_seconds": duration,
            "status": run.status,
            "summary": _sourcing_summary(run.job_name, run.stats, run.error_message, run.status),
            "stats": run.stats,
        })

    nights = []
    for date_key in sorted(by_date.keys(), reverse=True):
        jobs = by_date[date_key]
        statuses = {j["status"] for j in jobs}
        if statuses == {"success"}:
            health = "healthy"
        elif "success" in statuses:
            health = "partial"
        else:
            health = "failed"
        nights.append({"date": date_key, "jobs": jobs, "health": health})

    return {"nights": nights}


# ── Endpoint 10: Test email ───────────────────────────────────────────────────

@router.post("/overnight/test-email")
async def send_test_email(request: Request, db: AsyncSession = Depends(get_db)):
    user_id = _user_id_from_request(request)

    profile_result = await db.execute(
        select(FirmProfile.notification_emails)
        .where(FirmProfile.user_id == user_id)
        .where(FirmProfile.is_active == True)
        .limit(1)
    )
    notification_emails = profile_result.scalar()
    if not notification_emails:
        return {"success": False, "email": None}

    first_email = notification_emails.split(",")[0].strip()

    from app.services.notification_service import _send_email
    success = _send_email(
        subject="Reidar — Test Notification",
        html_content=(
            "<p>This is a test notification from Reidar. "
            "Your alerts are configured correctly.</p>"
        ),
        to_email=notification_emails,
    )

    return {"success": success, "email": first_email}
