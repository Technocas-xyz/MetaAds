"""
Single definition of a "winning" competitor ad.

An advertiser keeps paying for an ad only while it works, so longevity is the
signal: a winning ad is one that is still active and has been running for at
least N days (30 by default; the Competitors page lets users pick 30/60/90/120). AI confidence says how sure the analysis is, not
how well the ad performs, and plays no part here.
"""

from datetime import date, timedelta

from sqlalchemy import and_, or_

from app.models.ad import Ad

WINNING_MIN_DAYS = 30
WINNING_DAY_OPTIONS = (30, 60, 90, 120)
ACTIVE_STATUSES = ("approved", "pending")


def winning_ad_filter(min_days: int = WINNING_MIN_DAYS):
    """SQLAlchemy condition: active and running for at least `min_days` days."""
    cutoff = date.today() - timedelta(days=min_days)
    return and_(
        Ad.status.in_(ACTIVE_STATUSES),
        or_(
            # Real Meta start date when we have it…
            Ad.active_since <= cutoff,
            # …otherwise the day count captured at scrape time.
            and_(Ad.active_since.is_(None), Ad.days_running >= min_days),
        ),
    )
