import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.startup import Startup
from app.models.signal import CompanySignal
from app.services.classifier import detect_signals

logger = logging.getLogger(__name__)


async def refresh_company(startup: Startup, db: AsyncSession) -> list:
    try:
        raw_signals = await detect_signals(
            company_name=startup.name,
            one_liner=startup.one_liner or startup.ai_summary or "",
            website=startup.website,
            funding_stage=startup.funding_stage,
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
                startup_id=startup.id,
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
                await write_company_signal_notification(db, startup, signal)
            except Exception as notify_err:
                logger.warning(f"Failed to write signal notification: {notify_err}")
            try:
                from app.services.activity_writer import write_signal_detected
                await write_signal_detected(
                    db=db,
                    startup_id=startup.id,
                    startup_name=startup.name,
                    signal_title=title,
                    signal_type=signal_type,
                    user_id=getattr(startup, 'user_id', None),
                )
            except Exception as e:
                logger.warning(f"Failed to write signal activity for {startup.name}: {e}")
            added.append(signal)
        if added:
            startup.has_unseen_signals = True
        startup.last_refreshed_at = datetime.utcnow()
        await db.commit()
        logger.info(f"Refreshed {startup.name}: {len(added)} new signals")
        return added
    except Exception as e:
        logger.error(f"Refresh failed for {startup.name}: {e}")
        return []
