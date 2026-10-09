"""Tests for the Ads Library analysis-status filter.

The list query filters by analysis status with EXISTS subqueries so the filter
composes with the other filters and keeps pagination/counts correct. These are
pure-logic tests: the statements are compiled to SQL (no database, no AI).
"""

from sqlalchemy import select, func

from app.routers.ads import _analyzed_exists, _failed_ad_exists, FAILED_ANALYSIS_LABEL
from app.models.ad import Ad
from app.models.competitor import Competitor


def _sql(stmt) -> str:
    return str(stmt.compile(compile_kwargs={"literal_binds": True})).lower()


def _build(status, competitor=None):
    """Mirror how list_ads assembles the status (and optional competitor) filter."""
    stmt = select(Ad.id)
    if competitor:
        stmt = stmt.join(Competitor, Ad.competitor_id == Competitor.id).where(
            func.lower(Competitor.name) == func.lower(competitor)
        )
    if status == "analyzed":
        stmt = stmt.where(_analyzed_exists())
    elif status == "failed":
        stmt = stmt.where(~_analyzed_exists(), _failed_ad_exists())
    elif status == "pending":
        stmt = stmt.where(~_analyzed_exists(), ~_failed_ad_exists())
    return _sql(stmt)


# ─── The failed marker matches analysis_service._save_failed_analysis ──────────

def test_failed_label_is_the_review_queue_label():
    assert FAILED_ANALYSIS_LABEL == "Analysis Failed"


# ─── analyzed ──────────────────────────────────────────────────────────────────

def test_analyzed_requires_an_analysis_row():
    sql = _build("analyzed")
    # EXISTS over ad_analyses, correlated on ad id; no NOT EXISTS.
    assert "exists" in sql
    assert "ad_analyses" in sql
    assert "not (exists" not in sql
    # analyzed does not look at the review queue at all
    assert "review_queue" not in sql


# ─── pending ────────────────────────────────────────────────────────────────────

def test_pending_excludes_analyzed_and_failed():
    sql = _build("pending")
    # Two NOT EXISTS: no analysis AND no failed review-queue row.
    assert sql.count("not (exists") == 2
    assert "ad_analyses" in sql
    assert "review_queue" in sql
    assert "analysis failed" in sql


# ─── failed ──────────────────────────────────────────────────────────────────────

def test_failed_requires_no_analysis_but_a_failed_row():
    sql = _build("failed")
    # One NOT EXISTS (no analysis) + one EXISTS (failed review-queue row).
    assert sql.count("not (exists") == 1
    assert "review_queue" in sql
    assert "analysis failed" in sql


# ─── combined with a competitor filter ─────────────────────────────────────────

def test_analyzed_combined_with_competitor():
    sql = _build("analyzed", competitor="Highly Flavored")
    # Competitor join + name predicate AND the analyzed EXISTS all present.
    assert "join competitors" in sql
    assert "lower(competitors.name)" in sql
    assert "highly flavored" in sql
    assert "exists" in sql and "ad_analyses" in sql


def test_pending_combined_with_competitor():
    sql = _build("pending", competitor="Rooster DTF")
    assert "join competitors" in sql
    assert "rooster dtf" in sql
    assert sql.count("not (exists") == 2
