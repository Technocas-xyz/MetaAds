"""Tests for the shared-creative image fallback in scraper_service.

_fill_missing_images_from_siblings copies a creative onto an imageless ad from a
same-competitor ad with identical primary_text that has one. These tests use a
fake AsyncSession that returns a fixed set of ads; no database or AI is touched.
"""

import asyncio
import uuid

from app.models.ad import Ad
from app.services.scraper_service import _fill_missing_images_from_siblings


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return list(self._items)


class FakeSession:
    """Returns the configured ads for the single select(Ad) the helper runs."""
    def __init__(self, ads):
        self._ads = ads

    async def execute(self, stmt):
        return FakeResult(self._ads)


def _ad(competitor_id, primary_text, *, image=False, video=False):
    return Ad(
        id=uuid.uuid4(),
        competitor_id=competitor_id,
        platform="facebook",
        primary_text=primary_text,
        screenshot_url="https://cdn/pic.png" if image else None,
        media_url=None,
        video_poster_url=None,
        is_video=video,
    )


def test_same_text_same_competitor_copies_image():
    comp = uuid.uuid4()
    donor = _ad(comp, "Same copy here", image=True, video=True)
    needy = _ad(comp, "Same copy here")  # no image
    db = FakeSession([donor, needy])

    filled = asyncio.run(_fill_missing_images_from_siblings(db, comp))

    assert filled == 1
    assert needy.screenshot_url == donor.screenshot_url
    assert needy.is_video is True  # donor was a video


def test_different_competitor_does_not_copy():
    comp_a, comp_b = uuid.uuid4(), uuid.uuid4()
    donor = _ad(comp_a, "Shared text", image=True)
    needy = _ad(comp_b, "Shared text")  # same text, different competitor
    # Query is per-competitor, so only comp_b's ads are passed in here.
    db = FakeSession([needy])

    filled = asyncio.run(_fill_missing_images_from_siblings(db, comp_b))

    assert filled == 0
    assert needy.screenshot_url is None
    assert donor.screenshot_url == "https://cdn/pic.png"  # donor untouched


def test_ad_with_image_is_left_alone():
    comp = uuid.uuid4()
    existing = _ad(comp, "Copy", image=True)
    existing.screenshot_url = "https://cdn/original.png"
    sibling = _ad(comp, "Copy", image=True)
    sibling.screenshot_url = "https://cdn/other.png"
    db = FakeSession([existing, sibling])

    filled = asyncio.run(_fill_missing_images_from_siblings(db, comp))

    assert filled == 0
    # Already had its own image — not overwritten.
    assert existing.screenshot_url == "https://cdn/original.png"


def test_no_donor_for_text_leaves_ad_imageless():
    comp = uuid.uuid4()
    needy = _ad(comp, "Unique copy")
    other = _ad(comp, "Different copy", image=True)
    db = FakeSession([needy, other])

    filled = asyncio.run(_fill_missing_images_from_siblings(db, comp))

    assert filled == 0
    assert needy.screenshot_url is None


def test_blank_primary_text_is_never_matched():
    comp = uuid.uuid4()
    donor = _ad(comp, "", image=True)
    needy = _ad(comp, "")
    db = FakeSession([donor, needy])

    filled = asyncio.run(_fill_missing_images_from_siblings(db, comp))

    assert filled == 0  # empty text must not group ads together
    assert needy.screenshot_url is None
