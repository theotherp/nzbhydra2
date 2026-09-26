from ticketbot.comment_text import (
    MAX_COMMENT_LENGTH,
    build_comment_text,
    is_allowed_url,
    sanitize_comment,
)

REPO = "theotherp/nzbhydra2"


def test_mentions_are_neutralized_but_emails_untouched():
    text = sanitize_comment("Hi @reporter and @org/team, mail me at a@b.com", REPO)

    assert "@reporter" not in text
    assert "@org/team" not in text
    assert "@‍reporter" in text
    assert "a@b.com" in text


def test_disallowed_markdown_links_are_reduced_to_their_text():
    text = sanitize_comment("See [the docs](https://evil.example/phish) or ![img](http://x.org/a.png)", REPO)

    assert text == "See the docs or img"


def test_disallowed_bare_urls_are_removed():
    text = sanitize_comment("Go to https://evil.example/x or www.evil.example now", REPO)

    assert "evil" not in text
    assert text.count("(link removed)") == 2


def test_allowed_links_are_kept():
    text = (
        "Get it from http://127.0.0.1:5076/system/bugreport or http://localhost:5076/system/bugreport, "
        "see [wiki](https://github.com/theotherp/nzbhydra2/wiki/Debug) and https://github.com/theotherp/other"
    )

    assert sanitize_comment(text, REPO) == text


def test_allowed_url_rules():
    assert is_allowed_url("https://github.com/theotherp/nzbhydra2/issues/1", REPO)
    assert is_allowed_url("https://github.com/someone/fork/wiki/Page", "someone/fork")
    assert not is_allowed_url("https://github.com/attacker/repo", REPO)
    assert not is_allowed_url("https://github.com.evil.example/theotherp/x", REPO)
    assert not is_allowed_url("https://127.0.0.1.evil.example/", REPO)


def test_length_is_capped():
    text = sanitize_comment("x" * 10_000, REPO)

    assert len(text) <= MAX_COMMENT_LENGTH + 10


def test_empty_comment_falls_back_to_template():
    text = build_comment_text("   ", ["NZBHydra2 version", "steps to reproduce"], REPO)

    assert "- NZBHydra2 version" in text
    assert "- steps to reproduce" in text
    assert "debug" in text
    assert "http://127.0.0.1:5076/system/bugreport" in text
    assert "host or port" in text


def test_fallback_without_missing_items_asks_for_debug_infos():
    text = build_comment_text("", [], REPO)

    assert "- the debug infos ZIP" in text


def test_fallback_items_are_sanitized_too():
    text = build_comment_text("", ["ping @someone at https://evil.example"], REPO)

    assert "@someone" not in text
    assert "evil.example" not in text


def test_raw_html_link_is_stripped_to_its_text():
    text = sanitize_comment('<a href="//evil.example/x">click</a>', REPO)

    assert text == "click"
    assert "evil.example" not in text


def test_protocol_relative_bare_url_is_removed():
    text = sanitize_comment("See //evil.example/x for details", REPO)

    assert "evil.example" not in text
    assert "(link removed)" in text


def test_path_traversal_past_the_allowed_owner_is_rejected():
    text = sanitize_comment("[x](https://github.com/theotherp/../attacker/r)", REPO)

    assert text == "x"
    assert "attacker" not in text


def test_html_and_path_traversal_bypass_combined():
    out = sanitize_comment(
        '<a href="//evil.example/x">click</a> '
        "[x](https://github.com/theotherp/../attacker/r)",
        REPO,
    )

    assert "evil.example" not in out
    assert "attacker" not in out
