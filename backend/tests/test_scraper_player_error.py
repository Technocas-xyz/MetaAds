"""Tests for is_player_error — the detector for Meta's video-player codec error.

When the scraper's browser lacks the H.264 codec, Meta replaces a video ad's
player with a "having trouble playing this video" message. is_player_error must
flag that text (so it is never stored as ad copy) without flagging real ad copy
that merely mentions the word "video".
"""

from app.scripts.run_scraper import is_player_error


def test_exact_meta_message():
    assert is_player_error("Sorry, we're having trouble with playing this video.") is True


def test_variant_curly_apostrophe_and_learn_more():
    # Curly apostrophe plus a trailing "Learn more" line, as Meta renders it.
    text = "Sorry, we\u2019re having trouble playing this video\nLearn more"
    assert is_player_error(text) is True


def test_uppercase_variant():
    assert is_player_error("WE'RE HAVING TROUBLE WITH PLAYING THIS VIDEO") is True


def test_normal_ad_copy_mentioning_video():
    assert is_player_error("Watch our new video to see the DTF transfers in action!") is False


def test_empty_string():
    assert is_player_error("") is False


def test_none():
    assert is_player_error(None) is False
