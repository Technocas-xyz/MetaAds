"""Tests for the Hook Library filtering, now backed by the shared
_library_common helper. Pure-logic: statements are compiled to SQL (no
database) and the trending rule is a plain function. No AI provider is touched.
"""

import inspect
import uuid

from sqlalchemy import func

from app.routers import hooks as hooks_router
from app.routers._library_common import (
    LibraryFilters,
    apply_filters,
    base,
    compute_trending,
)
from app.models.ad_analysis import AdAnalysis

SPEC = hooks_router.SPEC


def _sql(stmt, literals=False) -> str:
    kw = {"compile_kwargs": {"literal_binds": True}} if literals else {}
    return str(stmt.compile(**kw)).lower()


# ─── Filter normalization ──────────────────────────────────────────────────────

def test_sentinels_become_none():
    f = LibraryFilters(dimension="All Types", competitor_id="All Competitors")
    assert f.dimension is None
    assert f.competitor_id is None


def test_blank_and_whitespace_become_none():
    f = LibraryFilters(search="   ", dimension="")
    assert f.search is None
    assert f.dimension is None


def test_real_values_preserved():
    f = LibraryFilters(search="save", dimension="Pain")
    assert f.search == "save"
    assert f.dimension == "Pain"


# ─── apply_filters builds the right WHERE clauses ──────────────────────────────

def test_no_filters_only_requires_hook_text():
    f = LibraryFilters()
    sql = _sql(apply_filters(base().add_columns(func.count()), f, SPEC))
    assert "ad_analyses.hook_text is not null" in sql
    assert "competitor_id" not in sql
    assert "confidence_score" not in sql
    assert "active_since" not in sql


def test_each_filter_adds_its_clause():
    f = LibraryFilters(
        search="save", dimension="Pain", competitor_id=str(uuid.uuid4()),
        min_confidence=50, max_confidence=80, date_from="2026-01-01", date_to="2026-02-01",
    )
    sql = _sql(apply_filters(base().add_columns(func.count()), f, SPEC))
    assert "ad_analyses.hook_text" in sql and "like" in sql
    assert "lower(ad_analyses.hook_type) =" in sql
    assert "ads.competitor_id =" in sql
    assert "ad_analyses.confidence_score >=" in sql
    assert "ad_analyses.confidence_score <=" in sql
    assert "ads.active_since >=" in sql
    assert "ads.active_since <=" in sql


def test_filter_helper_is_shared_by_all_endpoints():
    """Guard against drift: every read endpoint must route through apply_filters."""
    for fn in (
        hooks_router.get_hooks_summary,
        hooks_router.get_hooks_type_distribution,
        hooks_router.get_hooks_performance,
        hooks_router.get_hooks_trend,
        hooks_router.list_hooks,
    ):
        src = inspect.getsource(fn)
        assert "apply_filters" in src, f"{fn.__name__} does not use the shared helper"


# ─── Trending calculation ──────────────────────────────────────────────────────

def test_trending_new_hook():
    assert compute_trending(cur_n=4, prev_n=0, has_prev_period=True) == "New"


def test_trending_growing_hook():
    assert compute_trending(cur_n=10, prev_n=5, has_prev_period=True) == 100.0


def test_trending_declining_hook():
    assert compute_trending(cur_n=3, prev_n=6, has_prev_period=True) == -50.0


def test_trending_not_enough_data_no_prev_period():
    assert compute_trending(cur_n=5, prev_n=0, has_prev_period=False) is None


def test_trending_not_active_this_week():
    assert compute_trending(cur_n=0, prev_n=9, has_prev_period=True) is None
