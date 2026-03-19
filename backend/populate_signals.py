import asyncio
import sys
sys.path.insert(0, "/Users/remibalassanian/radar/backend")

from datetime import datetime, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.init_db import init_db
from app.models.company import Company
from app.models.firm_company_score import FirmCompanyScore
from app.models.signal import CompanySignal

DEMO_SIGNALS = [
    {"company": "Cogna", "signal_type": "funding_round", "title": "Cogna raises $6M seed round led by a16z", "summary": "Cogna closed a $6M seed round with Andreessen Horowitz leading. The funding will accelerate product development and enterprise sales.", "days_ago": 2},
    {"company": "Legalon", "signal_type": "funding_round", "title": "Legalon announces $4.5M pre-seed financing", "summary": "Legal AI startup Legalon raised $4.5M in pre-seed financing from Sequoia Scout.", "days_ago": 5},
    {"company": "MedScribe AI", "signal_type": "funding_round", "title": "MedScribe AI closes $8M Series A", "summary": "MedScribe AI raised $8M to expand its ambient documentation platform to 500+ hospital systems.", "days_ago": 8},
    {"company": "Paralegal AI", "signal_type": "product_launch", "title": "Paralegal AI launches contract negotiation copilot", "summary": "New feature allows legal teams to negotiate contract redlines in real-time using AI, cutting review cycles by 60%.", "days_ago": 3},
    {"company": "TaxPilot", "signal_type": "product_launch", "title": "TaxPilot releases SMB tax filing suite for 2025", "summary": "TaxPilot launched its 2025 suite now covering 95% of SMB entity types.", "days_ago": 6},
    {"company": "ComplianceOS", "signal_type": "product_launch", "title": "ComplianceOS adds real-time regulatory change alerts", "summary": "New monitoring feature tracks 400+ regulatory bodies and sends instant alerts when rules change.", "days_ago": 11},
    {"company": "Norm AI", "signal_type": "headcount_growth", "title": "Norm AI doubles engineering team in Q1 2025", "summary": "Norm AI grew from 12 to 24 engineers with key hires from OpenAI and Palantir.", "days_ago": 7},
    {"company": "AuditMind", "signal_type": "headcount_growth", "title": "AuditMind hiring surge - 15 open roles posted", "summary": "AuditMind posted 15 new roles across sales, engineering, and customer success.", "days_ago": 12},
    {"company": "Anterior", "signal_type": "leadership_change", "title": "Anterior names former Epic Systems VP as CRO", "summary": "Anterior hired Sarah Chen, former VP of Sales at Epic Systems, as Chief Revenue Officer.", "days_ago": 4},
    {"company": "Turion", "signal_type": "leadership_change", "title": "Turion appoints ex-Markel CTO to lead engineering", "summary": "Insurance AI startup Turion brought on Marcus Webb, former CTO of Markel Specialty.", "days_ago": 9},
    {"company": "ReguBot", "signal_type": "news_mention", "title": "ReguBot featured in WSJ as top RegTech startup to watch", "summary": "Wall Street Journal profiled ReguBot in a piece on AI compliance tools.", "days_ago": 1},
    {"company": "Lexi AI", "signal_type": "news_mention", "title": "Lexi AI wins American Bar Association innovation award", "summary": "Lexi AI received the ABA Legal Technology Innovation Award for its case research platform.", "days_ago": 10},
    {"company": "ClaimFlow", "signal_type": "traction_update", "title": "ClaimFlow reaches $2M ARR milestone", "summary": "ClaimFlow hit $2M ARR with 18 insurance carrier clients and 140% net revenue retention.", "days_ago": 6},
    {"company": "Synthetix", "signal_type": "traction_update", "title": "Synthetix signs three Fortune 500 enterprise contracts", "summary": "Synthetix announced contracts with three Fortune 500 companies adding $1.8M in ARR.", "days_ago": 14},
]

async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(CompanySignal).limit(1))
        if existing.scalar_one_or_none():
            print("Signals already exist. Skipping.")
            return
        seeded = 0
        for d in DEMO_SIGNALS:
            result = await db.execute(select(Startup).where(Startup.name == d["company"]))
            startup = result.scalar_one_or_none()
            if not startup:
                print(f"  Not found: {d['company']}")
                continue
            db.add(CompanySignal(
                startup_id=startup.id,
                signal_type=d["signal_type"],
                title=d["title"],
                summary=d["summary"],
                is_seen=False,
                detected_at=datetime.utcnow() - timedelta(days=d["days_ago"]),
            ))
            startup.has_unseen_signals = True
            startup.last_refreshed_at = datetime.utcnow()
            seeded += 1
            print(f"  + {d['company']}: {d['title'][:55]}...")
        await db.commit()
        print(f"\nDone — {seeded} signals added")

if __name__ == "__main__":
    asyncio.run(main())
