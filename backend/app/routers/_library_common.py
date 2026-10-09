"""
Shared helpers for the Hook / Angle / Offer "Library" pages.

All three pages aggregate the same table set — ad_analyses JOIN ads (JOIN
competitors for the avatars) — and share the same filter rules:

  * search          — ILIKE on the page's text column(s)
  * <dimension>     — the page's own category (hook_type / angle / offer_type)
  * competitor_id   — Ad.competitor_id
  * min/max_confidence
  * date_from/to    — on ads.active_since (when the ad started running)

Rather than copy this filter logic into three routers, each router builds a
LibrarySpec describing its dimension column, value column and extra search
columns, and calls the functions here. Behaviour is identical to the original
Hook Library implementation.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta, date as date_type
from typing import Callable, List, Optional

from fastapi import Query
from sqlalchemy import select, func, distinct, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ad import Ad
from app.models.ad_analysis import AdAnalysis
from app.models.competitor import Competitor

# "None"/"none"/blank values are noise, not a real category.
NONE_VALUES = ("none", "n/a", "")

# A per-ad identity that de-duplicates on ad_library_id but still counts ads
# with no library id once (keyed on their row id). Used everywhere "mentions",
# "ads behind a bar" or trend counts are computed, so each ad counts once.
AD_KEY = func.coalesce(Ad.ad_library_id, cast(Ad.id, String))


def initials(name: str) -> str:
    """2-letter initials for a competitor name."""
    if not name:
        return "?"
    words = name.split()
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper()


@dataclass
class LibrarySpec:
    """Describes one library page's columns.

    dimension_col : the category grouped on and shown in the donut/longevity
                    bars + the dropdown (hook_type / angle / offer_type).
    value_col     : the per-row key for the table (hook_text / angle /
                    offer_value). May equal dimension_col (angles).
    search_cols   : columns the free-text search matches against.
    exclude_none  : when True, rows whose dimension is null/"None" are dropped
                    everywhere (offers, where "None" means "no offer").
    """
    dimension_col: object
    value_col: object
    search_cols: List[object] = field(default_factory=list)
    exclude_none: bool = False


class LibraryFilters:
    """Parsed, normalized Library filters shared by every endpoint on a page.

    A plain data object (no FastAPI defaults) so it is trivial to build in
    tests; request parsing lives in make_filters_dependency().
    """

    def __init__(
        self,
        search: Optional[str] = None,
        dimension: Optional[str] = None,
        competitor_id: Optional[str] = None,
        min_confidence: Optional[float] = None,
        max_confidence: Optional[float] = None,
        date_from: Optional[date_type] = None,
        date_to: Optional[date_type] = None,
    ):
        self.search = (search or "").strip() or None
        self.dimension = self._clean(dimension)
        self.competitor_id = self._clean(competitor_id)
        self.min_confidence = min_confidence
        self.max_confidence = max_confidence
        self.date_from = date_from
        self.date_to = date_to

    # Any "All …" sentinel the dropdowns send means "no filter".
    _SENTINELS = {"all", "all types", "all competitors", "all offers", "all angles"}

    @classmethod
    def _clean(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        v = value.strip()
        if not v or v.lower() in cls._SENTINELS:
            return None
        return v


def make_filters_dependency(dimension_param: str) -> Callable:
    """Build a FastAPI dependency that reads this page's query params.

    `dimension_param` is the query-param name for the page's own dimension
    (e.g. "hook_type", "angle", "offer_type"), so each page keeps a clean,
    self-describing API while sharing the parsing logic.
    """

    def dependency(
        search: Optional[str] = Query(None),
        competitor_id: Optional[str] = Query(None),
        min_confidence: Optional[float] = Query(None, ge=0, le=100),
        max_confidence: Optional[float] = Query(None, ge=0, le=100),
        date_from: Optional[date_type] = Query(None),
        date_to: Optional[date_type] = Query(None),
        dimension: Optional[str] = Query(None, alias=dimension_param),
    ) -> LibraryFilters:
        return LibraryFilters(
            search=search,
            dimension=dimension,
            competitor_id=competitor_id,
            min_confidence=min_confidence,
            max_confidence=max_confidence,
            date_from=date_from,
            date_to=date_to,
        )

    return dependency


def base():
    """FROM ad_analyses JOIN ads — the row set every aggregation starts from."""
    return select().select_from(AdAnalysis).join(Ad, Ad.id == AdAnalysis.ad_id)


def apply_filters(stmt, f: LibraryFilters, spec: LibrarySpec):
    """Add every active filter to a statement already selecting FROM
    ad_analyses JOIN ads. The single source of truth for "the current view" —
    every endpoint routes through it so the cards, charts and table cannot drift.
    """
    stmt = stmt.where(spec.value_col.is_not(None))
    if spec.exclude_none:
        stmt = stmt.where(func.lower(spec.dimension_col).notin_(NONE_VALUES))
    if f.search and spec.search_cols:
        clause = None
        for col in spec.search_cols:
            cond = col.ilike(f"%{f.search}%")
            clause = cond if clause is None else (clause | cond)
        stmt = stmt.where(clause)
    if f.dimension:
        stmt = stmt.where(func.lower(spec.dimension_col) == f.dimension.lower())
    if f.competitor_id:
        stmt = stmt.where(Ad.competitor_id == f.competitor_id)
    if f.min_confidence is not None:
        stmt = stmt.where(AdAnalysis.confidence_score >= f.min_confidence)
    if f.max_confidence is not None:
        stmt = stmt.where(AdAnalysis.confidence_score <= f.max_confidence)
    if f.date_from:
        stmt = stmt.where(Ad.active_since >= f.date_from)
    if f.date_to:
        stmt = stmt.where(Ad.active_since <= f.date_to)
    return stmt


async def filter_options(db: AsyncSession, spec: LibrarySpec):
    """(competitors, dimension_values) for the page's dropdowns, all derived
    from analyzed ads. Competitors must have >=1 analyzed ad; dimension values
    exclude null and "None".
    """
    comp_stmt = (
        select(Competitor.id, Competitor.name)
        .join(Ad, Ad.competitor_id == Competitor.id)
        .join(AdAnalysis, AdAnalysis.ad_id == Ad.id)
        .where(spec.value_col.is_not(None))
        .distinct()
        .order_by(Competitor.name)
    )
    competitors = [(str(cid), name) for cid, name in (await db.execute(comp_stmt)).all()]

    dim_stmt = (
        select(spec.dimension_col)
        .where(spec.dimension_col.is_not(None), spec.value_col.is_not(None))
        .distinct()
        .order_by(spec.dimension_col)
    )
    values = [
        r[0] for r in (await db.execute(dim_stmt)).all()
        if r[0] and r[0].strip().lower() not in NONE_VALUES
    ]
    return competitors, values


async def trend_windows(db: AsyncSession, f: LibraryFilters, spec: LibrarySpec):
    """Per-value de-duplicated ad counts for the last 7 days vs the 7 days
    before, by ads.active_since. Returns (current, previous) dicts keyed on the
    page's value column.
    """
    today = datetime.now(timezone.utc).date()
    cur_start = today - timedelta(days=7)
    prev_start = today - timedelta(days=14)
    ad_count = func.count(distinct(AD_KEY))

    async def window(start, end):
        stmt = apply_filters(
            base().add_columns(spec.value_col, ad_count.label("c")), f, spec
        ).where(
            Ad.active_since.is_not(None),
            Ad.active_since >= start,
            Ad.active_since < end,
        ).group_by(spec.value_col)
        return {r[0]: r[1] for r in (await db.execute(stmt)).all()}

    current = await window(cur_start, today + timedelta(days=1))
    previous = await window(prev_start, cur_start)
    return current, previous


def compute_trending(cur_n: int, prev_n: int, has_prev_period: bool):
    """Trending value for one row:
      - "New"  : ran this week, nothing in the earlier period
      - None   : not enough data (no activity this week, or no earlier period
                 to compare against) -> frontend shows a dash
      - float  : percent change this week vs the previous week
    Never a made-up number.
    """
    if cur_n <= 0:
        return None
    if not has_prev_period:
        return None
    if prev_n == 0:
        return "New"
    return round((cur_n - prev_n) / prev_n * 100, 1)
