import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.waitlist import WaitlistEntry
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class WaitlistRequest(BaseModel):
    email: str
    firm_name: str = ""


@router.post("/waitlist")
async def join_waitlist(
    payload: WaitlistRequest,
    db: AsyncSession = Depends(get_db),
):
    entry = WaitlistEntry(
        email=payload.email.strip().lower(),
        firm_name=payload.firm_name.strip() or None,
    )
    db.add(entry)
    await db.commit()

    _send_waitlist_notification(payload.email, payload.firm_name)

    return {"success": True}


def _send_waitlist_notification(email: str, firm_name: str) -> None:
    if not settings.SENDGRID_API_KEY:
        logger.info(f"Waitlist signup (no SendGrid): {email} / {firm_name}")
        return
    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail

        firm_line = f"<br><b>Firm:</b> {firm_name}" if firm_name.strip() else ""
        html = f"""
        <p>New waitlist signup:</p>
        <p><b>Email:</b> {email}{firm_line}</p>
        """
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email=settings.FROM_EMAIL,
            to_emails="remi@balassanian.com",
            subject=f"Reidar waitlist: {email}",
            html_content=html,
        )
        sg.send(message)
        logger.info(f"Waitlist notification sent for {email}")
    except Exception as e:
        logger.error(f"Waitlist email failed: {e}", exc_info=True)
