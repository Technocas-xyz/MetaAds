"""Tests for analysis_queue.start_if_pending — the auto-start gate.

start_if_pending must only kick off the batch when work is actually waiting and
no user or running job is in the way. These tests mock the pending-ad count and
stub out task creation + the batch coroutine, so no database or AI provider is
touched.
"""

import asyncio

import pytest

from app.services import analysis_queue
from app.services.job_controller import JobState, analyze_all_job


@pytest.fixture(autouse=True)
def reset_state(monkeypatch):
    """Reset the shared job + module flags, and stop any real task/coroutine."""
    analyze_all_job.reset()
    analysis_queue._user_stopped = False

    created = {"count": 0}

    def fake_create_task(coro):
        # Close the coroutine so it never runs (no DB / AI calls) and no warning.
        coro.close()
        created["count"] += 1
        return None

    monkeypatch.setattr(analysis_queue.asyncio, "create_task", fake_create_task)
    yield created

    analyze_all_job.reset()
    analysis_queue._user_stopped = False


def _set_pending(monkeypatch, count: int):
    async def fake_count():
        return count
    monkeypatch.setattr(analysis_queue, "_count_pending", fake_count)


def test_returns_false_when_job_active(monkeypatch, reset_state):
    _set_pending(monkeypatch, 25)
    analyze_all_job.start(10)  # state == RUNNING -> is_active True

    assert asyncio.run(analysis_queue.start_if_pending("periodic check")) is False
    assert reset_state["count"] == 0  # nothing started


def test_returns_false_when_nothing_pending(monkeypatch, reset_state):
    _set_pending(monkeypatch, 0)

    assert asyncio.run(analysis_queue.start_if_pending("periodic check")) is False
    assert reset_state["count"] == 0


def test_returns_false_after_manual_stop(monkeypatch, reset_state):
    _set_pending(monkeypatch, 25)
    analysis_queue.note_user_stopped()

    assert asyncio.run(analysis_queue.start_if_pending("periodic check")) is False
    assert reset_state["count"] == 0


def test_returns_true_when_pending(monkeypatch, reset_state):
    _set_pending(monkeypatch, 25)

    assert asyncio.run(analysis_queue.start_if_pending("periodic check")) is True
    assert reset_state["count"] == 1  # batch task created once
    # The real batch coroutine (which calls .start()) is stubbed out, so the job
    # has only been reset to IDLE here; the point is that a task was scheduled.
    assert analyze_all_job.state == JobState.IDLE


def test_scrape_finished_overrides_prior_stop(monkeypatch, reset_state):
    """A new scrape with fresh pending ads clears an earlier manual stop."""
    _set_pending(monkeypatch, 7)
    analysis_queue.note_user_stopped()

    assert asyncio.run(analysis_queue.start_if_pending("scrape finished")) is True
    assert reset_state["count"] == 1
