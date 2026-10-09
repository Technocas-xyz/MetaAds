"""Tests for the Hook Library shared filter helper and trending calculation.

These are pure-logic tests: the shared filter builder is exercised by compiling
the SQL it produces (no database), and the trending rule is a plain function.
No AI provider is touched.
"""

import uuid

from sqlalchemy import select, func

from app.routers import hooks as hooks_router
from app.routers.hooks import (
    HookFilters,
    apply_hook_filters,
    _base,
    _compute_trending,
)
from app.models.ad_analysis import AdAnalysis


def _sql(stmt, literals=True) -> str:
    """Compile a statement to a SQL string (optionally inlining literals)."""
    kw = {"compile_kwargs": {"literal_binds": True}} if literals else {}
    return str(stmt.compile(**kw))


# ─── HookFilters normalization ────────────────────────────────────────────────

def test_sentinels_become_none():
    f = HookFilters(
        hook_type="All Types",
        competitor_id="All Competitors",
        offer_type="All Offers",
    )
    assert f.hook_type is None
    assert f.competitor_id is None
    assert f.offer_type is None


def test_blank_and_whitespace_become_none():
    f = HookFilters(search="   ", hook_type="")
    assert f.search is None
    assert f.hook_type is None


def test_real_values_preserved():
    f = HookFilters(search="save", hook_type="Pain", offer_type="Free Shipping")
    assert f.search == "save"
    assert f.hook_type == "Pain"
    assert f.offer_type == "Free Shipping"


# ─── apply_hook_filters builds the right WHERE clauses ─────────────────────────

def _base_count():
    return apply_hook_filters  # marker; real base built per-test


def test_no_filters_only_requires_hook_text():
    f = HookFilters()
    stmt = apply_hook_filters(_base().add_columns(func.count()), f)
    sql = _sql(stmt).lower()
    assert "hook_text is not null" in sql
    # None of the optional filters should appear.
    assert "competitor_id" not in sql
    assert "confidence_score" not in sql
    assert "active_since" not in sql


def test_each_filter_adds_its_clause():
    cid = str(uuid.uuid4())
    f = HookFilters(
        search="save",
        hook_type="Pain",
        competitor_id=cid,
        offer_type="Free Shipping",
        min_confidence=50,
        max_confidence=80,
        date_from="2026-01-01",
        date_to="2026-02-01",
    )
    stmt = apply_hook_filters(_base().add_columns(func.count()), f)
    # Compile without inlining literals (a bare UUID string can't be rendered
    # as a UUID literal); check clause structure instead.
    sql = _sql(stmt, literals=False).lower()
    # The generic compiler renders ilike as "lower(hook_text) like lower(:p)".
    assert "ad_analyses.hook_text" in sql and "like" in sql   # search
    assert "lower(ad_analyses.hook_type)" in sql
    assert "ads.competitor_id =" in sql
    assert "lower(ad_analyses.offer_type)" in sql
    assert "ad_analyses.confidence_score >=" in sql
    assert "ad_analyses.confidence_score <=" in sql
    assert "ads.active_since >=" in sql
    assert "ads.active_since <=" in sql


def test_filter_helper_is_shared_by_all_endpoints():
    """Guard against drift: every read endpoint must route through the helper."""
    import inspect
    for fn in (
        hooks_router.get_hooks_summary,
        hooks_router.get_hooks_type_distribution,
        hooks_router.get_hooks_performance,
        hooks_router.get_hooks_trend,
        hooks_router.list_hooks,
    ):
        src = inspect.getsource(fn)
        assert "apply_hook_filters" in src, f"{fn.__name__} does not use the shared helper"


# ─── Trending calculation ──────────────────────────────────────────────────────

def test_trending_new_hook():
    # Ran this week, nothing before -> "New".
    assert _compute_trending(cur_n=4, prev_n=0, has_prev_period=True) == "New"


def test_trending_growing_hook():
    # 10 this week vs 5 before -> +100%.
    assert _compute_trending(cur_n=10, prev_n=5, has_prev_period=True) == 100.0


def test_trending_declining_hook():
    assert _compute_trending(cur_n=3, prev_n=6, has_prev_period=True) == -50.0


def test_trending_not_enough_data_no_prev_period():
    # No earlier period to compare against -> dash (None), never a made-up number.
    assert _compute_trending(cur_n=5, prev_n=0, has_prev_period=False) is None


def test_trending_not_active_this_week():
    # Nothing this week -> dash.
    assert _compute_trending(cur_n=0, prev_n=9, has_prev_period=True) is None
