"""Tests for the shared Library filter helper (_library_common) as used by the
Angle and Offer libraries, plus the trending rule, and a guard that the Hook
endpoints no longer accept or apply an offer_type filter.

Pure-logic tests: statements are compiled to SQL (no database) and plain
functions are called directly. No AI provider is touched.
"""

import inspect
import uuid

from sqlalchemy import func

from app.routers import hooks as hooks_router
from app.routers._library_common import (
    LibraryFilters,
    LibrarySpec,
    apply_filters,
    base,
    compute_trending,
)
from app.models.ad_analysis import AdAnalysis

ANGLE_SPEC = LibrarySpec(
    dimension_col=AdAnalysis.angle,
    value_col=AdAnalysis.angle,
    search_cols=[AdAnalysis.angle, AdAnalysis.angle_detail],
)
OFFER_SPEC = LibrarySpec(
    dimension_col=AdAnalysis.offer_type,
    value_col=AdAnalysis.offer_type,
    search_cols=[AdAnalysis.offer_value, AdAnalysis.offer_type],
    exclude_none=True,
)


def _sql(stmt, literals=False) -> str:
    kw = {"compile_kwargs": {"literal_binds": True}} if literals else {}
    return str(stmt.compile(**kw)).lower()


# ─── LibraryFilters normalization ──────────────────────────────────────────────

def test_sentinels_become_none():
    f = LibraryFilters(dimension="All Angles", competitor_id="All Competitors")
    assert f.dimension is None
    assert f.competitor_id is None


def test_blank_becomes_none_and_real_values_kept():
    assert LibraryFilters(search="   ").search is None
    f = LibraryFilters(search="save", dimension="Price")
    assert f.search == "save"
    assert f.dimension == "Price"


# ─── apply_filters (angle spec) ────────────────────────────────────────────────

def test_angle_no_filters_only_requires_value_not_null():
    f = LibraryFilters()
    sql = _sql(apply_filters(base().add_columns(func.count()), f, ANGLE_SPEC))
    assert "ad_analyses.angle is not null" in sql
    assert "competitor_id" not in sql
    assert "confidence_score" not in sql
    assert "active_since" not in sql


def test_angle_each_filter_adds_its_clause():
    f = LibraryFilters(
        search="fast", dimension="Speed", competitor_id=str(uuid.uuid4()),
        min_confidence=50, max_confidence=80, date_from="2026-01-01", date_to="2026-02-01",
    )
    sql = _sql(apply_filters(base().add_columns(func.count()), f, ANGLE_SPEC))
    # search spans both angle + angle_detail
    assert "ad_analyses.angle" in sql and "ad_analyses.angle_detail" in sql and "like" in sql
    assert "lower(ad_analyses.angle) =" in sql
    assert "ads.competitor_id =" in sql
    assert "ad_analyses.confidence_score >=" in sql
    assert "ad_analyses.confidence_score <=" in sql
    assert "ads.active_since >=" in sql
    assert "ads.active_since <=" in sql


# ─── apply_filters (offer spec) excludes None ──────────────────────────────────

def test_offer_spec_excludes_none_values():
    f = LibraryFilters()
    sql = _sql(apply_filters(base().add_columns(func.count()), f, OFFER_SPEC))
    # exclude_none => a NOT IN (...) guard on lower(offer_type)
    assert "lower(ad_analyses.offer_type)" in sql
    assert "not in" in sql


def test_angle_spec_does_not_exclude_none():
    f = LibraryFilters()
    sql = _sql(apply_filters(base().add_columns(func.count()), f, ANGLE_SPEC))
    assert "not in" not in sql


# ─── Trending rule ─────────────────────────────────────────────────────────────

def test_trending_new():
    assert compute_trending(4, 0, True) == "New"


def test_trending_growth():
    assert compute_trending(10, 5, True) == 100.0


def test_trending_decline():
    assert compute_trending(3, 6, True) == -50.0


def test_trending_no_prev_period_is_dash():
    assert compute_trending(5, 0, False) is None


def test_trending_inactive_this_week_is_dash():
    assert compute_trending(0, 9, True) is None


# ─── Hook endpoints no longer accept or apply offer_type ───────────────────────

def test_hook_filters_dependency_has_no_offer_type_param():
    sig = inspect.signature(hooks_router.hook_filters)
    params = sig.parameters
    # No offer_type param at all (neither name nor alias).
    assert "offer_type" not in params
    aliases = {getattr(p.default, "alias", None) for p in params.values()}
    assert "offer_type" not in aliases
    # Its own dimension is still accepted, exposed as the "hook_type" query alias.
    assert "dimension" in params
    assert "hook_type" in aliases


def test_hook_spec_filters_do_not_mention_offer_type():
    # A fully-populated LibraryFilters applied with the hook SPEC must never add
    # an offer_type clause (the hook page has no offer filter anymore).
    f = LibraryFilters(dimension="Pain", search="x", competitor_id=str(uuid.uuid4()))
    sql = _sql(apply_filters(base().add_columns(func.count()), f, hooks_router.SPEC))
    assert "offer_type" not in sql


def test_hook_row_schema_has_no_offer_type_field():
    from app.schemas.hook import HookRow
    assert "offer_type" not in HookRow.model_fields
