"""
Single definition of a "winning" competitor ad.

An advertiser keeps paying for an ad only while it works, so longevity is the
signal: a winning ad is one that is still active and has been running for more
than WINNING_MIN_DAYS days. AI confidence says how sure the analysis is, not
how well the ad performs, and plays no part here.
"""

from datetime import date, timedelta

from sqlalchemy import and_, or_

from app.models.ad import Ad

WINNING_MIN_DAYS = 30
ACTIVE_STATUSES = ("approved", "pending")


def winning_ad_filter():
    """SQLAlchemy condition: active and running for more than WINNING_MIN_DAYS days."""
    cutoff = date.today() - timedelta(days=WINNING_MIN_DAYS)
    return and_(
        Ad.status.in_(ACTIVE_STATUSES),
        or_(
            # Real Meta start date when we have it…
            Ad.active_since < cutoff,
            # …otherwise the day count captured at scrape time.
            and_(Ad.active_since.is_(None), Ad.days_running > WINNING_MIN_DAYS),
        ),
    )
