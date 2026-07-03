"""
Seed script — inserts the 26 DTF/print-on-demand competitors.
Run with: python -m app.scripts.seed_competitors

CHANGE LOG:
  9 competitors upgraded from keyword (q=) to page_id for better scraping.
  STILL keyword (no page_id yet): Underground Shirts
"""

import asyncio
import sys
from pathlib import Path

# Ensure app imports work
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.competitor import Competitor


COMPETITORS = [
    # ── Already page_id from the original list ────────────────────────────
    {
        "name": "Bear Transfers Print Center",
        "page_id": "414817938389278",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=414817938389278",
    },
    {
        "name": "Best Price DTF",
        "page_id": "154204877783820",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=154204877783820",
    },
    {
        "name": "Cobra DTF",
        "page_id": "749384108255279",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=749384108255279",
    },
    {
        "name": "Custom-transfers.com",
        "page_id": "101748588733861",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=101748588733861",
    },
    {
        "name": "DtfPrinceton",
        "page_id": "784905414696733",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=784905414696733",
    },
    {
        "name": "DTFSheet",
        "page_id": "102796042851211",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=102796042851211",
    },
    {
        "name": "DTF Station",
        "page_id": "119341557928243",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=119341557928243",
    },
    {
        "name": "DTF Transfer Nation",
        "page_id": "143116028890196",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=143116028890196",
    },
    {
        "name": "Flex DTF",
        "page_id": "650120261514354",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=650120261514354",
    },
    {
        "name": "Ghost DTF",
        "page_id": "241672425692886",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=241672425692886",
    },
    {
        "name": "Highly Flavored",
        "page_id": "107224735619550",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=107224735619550",
    },
    {
        "name": "Indiana DTF Print",
        "page_id": "621864687676477",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=621864687676477",
    },
    {
        "name": "Kingdom Designs",
        "page_id": "1068067756382924",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=1068067756382924",
    },
    {
        "name": "Rapid DTF",
        "page_id": "118279934500144",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=118279934500144",
    },
    {
        "name": "Rooster DTF Transfer Co",
        "page_id": "203223882865621",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=203223882865621",
    },
    {
        "name": "We Print U Press",
        "page_id": "106631815226185",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=106631815226185",
    },
    # ── Upgraded from keyword -> page_id ──────────────────────────────────
    {
        "name": "Blue Cotton",
        "page_id": "45760448438",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=45760448438",
    },
    {
        "name": "Bolt Printing",
        "page_id": "443162745736047",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=443162745736047",
    },
    {
        "name": "CustomInk",
        "page_id": "5699478389",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=5699478389",
    },
    {
        "name": "Lion DTF",
        "page_id": "116872181383608",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=116872181383608",
    },
    {
        "name": "Ninja Transfers",
        "page_id": "107728615530549",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=107728615530549",
    },
    {
        "name": "Ooshirts",
        "page_id": "222901201087447",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=222901201087447",
    },
    {
        "name": "RushOrderTees",
        "page_id": "58929521437",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=58929521437",
    },
    {
        "name": "Same Day Tees",
        "page_id": "247110908640403",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=247110908640403",
    },
    {
        "name": "Uberprints",
        "page_id": "19612219063",
        "query": None,
        "query_type": "page_id",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&view_all_page_id=19612219063",
    },
    # ── Still keyword (no page_id yet) ────────────────────────────────────
    {
        "name": "Underground Shirts",
        "page_id": None,
        "query": "undergroundshirts",
        "query_type": "keyword",
        "meta_ad_library_url": "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&q=undergroundshirts",
    },
]


async def seed():
    """Insert or update the 26 competitors."""
    async with AsyncSessionLocal() as db:
        inserted = 0
        updated = 0

        for comp_data in COMPETITORS:
            # Check if exists by name
            stmt = select(Competitor).where(Competitor.name == comp_data["name"])
            existing = (await db.execute(stmt)).scalar_one_or_none()

            if existing:
                # Update scraping fields
                existing.page_id = comp_data["page_id"]
                existing.query = comp_data["query"]
                existing.query_type = comp_data["query_type"]
                existing.meta_ad_library_url = comp_data["meta_ad_library_url"]
                updated += 1
            else:
                # Insert new
                competitor = Competitor(
                    name=comp_data["name"],
                    domain="",
                    page_id=comp_data["page_id"],
                    query=comp_data["query"],
                    query_type=comp_data["query_type"],
                    meta_ad_library_url=comp_data["meta_ad_library_url"],
                    status="Active",
                    niches=["DTF", "Print-on-Demand"],
                    priority_tier="Medium",
                    region="US",
                    tier=2,
                )
                db.add(competitor)
                inserted += 1

        await db.commit()
        print(f"[seed] Done: {inserted} inserted, {updated} updated. Total: {len(COMPETITORS)}")


if __name__ == "__main__":
    asyncio.run(seed())
