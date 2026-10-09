"""Tests for the two AI re-queue endpoints:

  * POST /review-queue/bulk-rerun          (routers.review_queue.bulk_rerun_ai)
  * POST /competitor-ads/rerun-low-confidence (routers.analysis.rerun_low_confidence)

Both resolve a set of ads, delete only those ads' ad_analyses rows so they become
pending, then hand off to the shared batch job via start_if_pending(). These tests
call the endpoint functions directly with a fake AsyncSession and patch
start_if_pending / note_user_started, so no database and no AI provider is touched.
"""

import asyncio
import uuid

import pytest
from sqlalchemy.sql import Select
from sqlalchemy.sql.dml import Delete

from app.routers import analysis as analysis_router
from app.routers import review_queue as review_router
from app.schemas.review import BulkActionRequest


class FakeResult:
    def __init__(self, values):
        self._values = values

    def scalars(self):
        return self

    def all(self):
        return list(self._values)


class FakeSession:
    """Minimal AsyncSession stand-in.

    `select_rows` is what the resolve SELECT returns (.scalars().all()).
    Every executed statement is recorded; DELETE statements are captured so the
    test can assert exactly which ad_ids were targeted.
    """

    def __init__(self, select_rows):
        self._select_rows = select_rows
        self.deletes = []        # list of sets of ad_id values targeted by DELETE
        self.commits = 0

    async def execute(self, stmt):
        if isinstance(stmt, Delete):
            # Pull the IN(...) values out of the compiled statement's params.
            # in_() uses an expanding bind param, so a value may itself be a
            # list/tuple of UUIDs — flatten before collecting.
            compiled = stmt.compile()
            targeted = set()
            for v in compiled.params.values():
                items = v if isinstance(v, (list, tuple, set)) else [v]
                for item in items:
                    if isinstance(item, uuid.UUID):
                        targeted.add(item)
            self.deletes.append(targeted)
            return FakeResult([])
        if isinstance(stmt, Select):
            return FakeResult(self._select_rows)
        return FakeResult([])

    async def commit(self):
        self.commits += 1


@pytest.fixture(autouse=True)
def patch_queue(monkeypatch):
    """Replace the queue hand-off so no batch/DB/AI runs; record the calls."""
    calls = {"started": 0, "note_started": 0, "reasons": []}

    async def fake_start_if_pending(reason):
        calls["started"] += 1
        calls["reasons"].append(reason)
        return True

    def fake_note_user_started():
        calls["note_started"] += 1

    import app.services.analysis_queue as q
    monkeypatch.setattr(q, "start_if_pending", fake_start_if_pending)
    monkeypatch.setattr(q, "note_user_started", fake_note_user_started)
    return calls


# ─── review-queue/bulk-rerun ──────────────────────────────────────────────────

def test_bulk_rerun_resolves_items_and_queues(patch_queue):
    ad_a, ad_b = uuid.uuid4(), uuid.uuid4()
    item_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
    db = FakeSession(select_rows=[ad_a, ad_b])

    result = asyncio.run(review_router.bulk_rerun_ai(
        payload=BulkActionRequest(ids=item_ids), db=db, current_user=object()
    ))

    assert result.queued == 2
    # Deleted analyses only for the two resolved ads.
    assert db.deletes == [{ad_a, ad_b}]
    assert db.commits == 1
    assert patch_queue["note_started"] == 1
    assert patch_queue["started"] == 1
    assert patch_queue["reasons"] == ["re-run requested"]


def test_bulk_rerun_no_items_does_nothing(patch_queue):
    db = FakeSession(select_rows=[])

    result = asyncio.run(review_router.bulk_rerun_ai(
        payload=BulkActionRequest(ids=[str(uuid.uuid4())]), db=db, current_user=object()
    ))

    assert result.queued == 0
    assert db.deletes == []       # nothing deleted
    assert db.commits == 0
    assert patch_queue["started"] == 0  # batch not touched


def test_bulk_rerun_ignores_invalid_ids(patch_queue):
    ad_a = uuid.uuid4()
    db = FakeSession(select_rows=[ad_a])

    # One malformed id string plus one valid-looking one; both are filtered to
    # valid UUIDs before the resolve query, and only resolved ads are deleted.
    result = asyncio.run(review_router.bulk_rerun_ai(
        payload=BulkActionRequest(ids=["not-a-uuid", str(uuid.uuid4())]),
        db=db, current_user=object(),
    ))

    assert result.queued == 1
    assert db.deletes == [{ad_a}]


# ─── competitor-ads/rerun-low-confidence ──────────────────────────────────────

def test_rerun_low_confidence_queues_matched_ads(patch_queue):
    ad_a, ad_b, ad_c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    db = FakeSession(select_rows=[ad_a, ad_b, ad_c])

    result = asyncio.run(analysis_router.rerun_low_confidence(
        db=db, current_user=object()
    ))

    assert result.queued == 3
    assert db.deletes == [{ad_a, ad_b, ad_c}]  # only the below-threshold ads
    assert db.commits == 1
    assert patch_queue["note_started"] == 1
    assert patch_queue["started"] == 1
    assert patch_queue["reasons"] == ["re-run requested"]


def test_rerun_low_confidence_none_matched(patch_queue):
    db = FakeSession(select_rows=[])

    result = asyncio.run(analysis_router.rerun_low_confidence(
        db=db, current_user=object()
    ))

    assert result.queued == 0
    assert db.deletes == []
    assert db.commits == 0
    assert patch_queue["started"] == 0
