import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.signal import CompanySignal
from app.services.classifier import detect_signals

logger = logging.getLogger(__name__)


async def refresh_company(score, db: AsyncSession) -> list:
    """
    Run signal detection for a single FirmCompanyScore (pipeline company).
    Loads the associated Company to get factual fields needed for the search.
    """
    try:
        company_result = await db.execute(
            select(Company).where(Company.id == score.company_id)
        )
        company = company_result.scalar_one_or_none()
        if not company:
            logger.warning(f"refresh_company: no Company found for score {score.id}")
            return []

        raw_signals = await detect_signals(
            company_name=company.name,
            one_liner=company.one_liner or company.ai_summary or "",
            website=company.website,
            funding_stage=company.funding_stage,
            db=db,
        )
        added = []
        for sig in raw_signals:
            signal_type = sig.get("signal_type", "news_mention")
            title = sig.get("title", "")
            summary = sig.get("summary", "")
            if not title or not summary:
                continue
            signal = CompanySignal(
                company_id=company.id,
                signal_type=signal_type,
                title=title,
                summary=summary,
                source_url=sig.get("source_url"),
                is_seen=False,
                detected_at=datetime.utcnow(),
            )
            db.add(signal)
            try:
                from app.services.notification_writer import write_company_signal_notification
                await write_company_signal_notification(db, score, signal, user_id=score.user_id, company_name=company.name)
            except Exception as notify_err:
                logger.warning(f"Failed to write signal notification: {notify_err}")
            try:
                from app.services.activity_writer import write_signal_detected
                await write_signal_detected(
                    db=db,
                    company_id=company.id,
                    startup_name=company.name,
                    signal_title=title,
                    signal_type=signal_type,
                    user_id=score.user_id,
                )
            except Exception as e:
                logger.warning(f"Failed to write signal activity for {company.name}: {e}")
            added.append(signal)
        if added:
            score.has_unseen_signals = True
        score.last_refreshed_at = datetime.utcnow()
        await db.commit()
        logger.info(f"Refreshed {company.name}: {len(added)} new signals")
        return added
    except Exception as e:
        logger.error(f"Refresh failed for score {getattr(score, 'id', '?')}: {e}")
        return []
