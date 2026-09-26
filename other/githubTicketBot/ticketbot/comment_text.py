"""Builds the text the bot posts, and makes Claude's comment safe to post.

Claude's comment is based on user-supplied issue content, so it's treated as
untrusted: @mentions are neutralized so nobody gets pinged, links to anywhere
but the project's own GitHub pages or the user's local NZBHydra2 are reduced
to their link text, and the length is capped.
"""
from __future__ import annotations

import posixpath
import re
from typing import List
from urllib.parse import urlparse

MARKER = "<!-- githubTicketBot -->"
FOOTER = "_I'm a bot and this check was done automatically. If I got something wrong just ignore me._"
COMPLETE_MESSAGE = "This looks complete now, thanks for the additional information!"

MAX_COMMENT_LENGTH = 3000
ALLOWED_GITHUB_OWNER = "theotherp"
LOCAL_HOSTS = ("127.0.0.1", "localhost")
LINK_REMOVED = "(link removed)"
ZERO_WIDTH_JOINER = "‍"

DEBUG_INFOS_INSTRUCTIONS = (
    "Please set the log level to debug, reproduce the problem and then download the debug infos ZIP "
    "from System / Bugreport (http://127.0.0.1:5076/system/bugreport) and attach it here. "
    "That address may differ if you changed NZBHydra2's host or port or it runs on a different machine; "
    "then use your usual NZBHydra2 address instead."
)

# [text](url) or ![alt](url), optionally with a "title"; or a bare URL
# (GitHub also autolinks bare www. hosts and protocol-relative //host URLs).
_LINK_REGEX = re.compile(
    r"(?P<md>!?\[(?P<text>[^\]]*)\]\(\s*<?(?P<md_url>[^)\s>]+)>?(?:\s+\"[^\"]*\")?\s*\))"
    r"|(?P<bare>(?:https?://|www\.|//)[^\s<>()\[\]\"'`]+)",
    re.IGNORECASE,
)
_MENTION_REGEX = re.compile(r"(?<![\w@/`])@(?=[A-Za-z0-9])")
# Raw HTML tags (e.g. an <a href="..."> a model could be tricked into
# emitting): stripped entirely rather than parsed, keeping only the text
# between them, since GitHub renders inline HTML in issue/PR comments.
_HTML_TAG_REGEX = re.compile(r"<[^>]+>")


def format_comment(text: str) -> str:
    return f"{text}\n\n{MARKER}\n{FOOTER}"


def is_allowed_url(url: str, repo: str) -> bool:
    if url.lower().startswith("www."):
        url = "https://" + url
    try:
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
    except ValueError:
        return False
    if host in LOCAL_HOSTS:
        return True
    if host in ("github.com", "www.github.com"):
        raw_path = parsed.path or "/"
        if ".." in raw_path.split("/"):
            # A traversal segment could otherwise make an allowed-looking
            # prefix (e.g. "/theotherp/../attacker/r") resolve elsewhere.
            return False
        path = posixpath.normpath(raw_path).lower()
        return path.startswith(f"/{ALLOWED_GITHUB_OWNER}/") or path.startswith(f"/{repo.lower()}/wiki")
    return False


def _replace_link(match: re.Match, repo: str) -> str:
    if match.group("md"):
        if is_allowed_url(match.group("md_url"), repo):
            return match.group("md")
        return match.group("text")
    url = match.group("bare")
    return url if is_allowed_url(url, repo) else LINK_REMOVED


def sanitize_comment(text: str, repo: str) -> str:
    text = _HTML_TAG_REGEX.sub("", text or "")
    text = _LINK_REGEX.sub(lambda m: _replace_link(m, repo), text)
    text = _MENTION_REGEX.sub("@" + ZERO_WIDTH_JOINER, text)
    text = text.strip()
    if len(text) > MAX_COMMENT_LENGTH:
        text = text[:MAX_COMMENT_LENGTH].rstrip() + "\n\n[...]"
    return text


def fallback_comment(missing_information: List[str]) -> str:
    items = [item.strip() for item in missing_information if item and item.strip()]
    if not items:
        items = ["the debug infos ZIP"]
    bullets = "\n".join(f"- {item}" for item in items)
    return (
        "Thanks for the report! To look into this I still need:\n\n"
        f"{bullets}\n\n"
        f"{DEBUG_INFOS_INSTRUCTIONS}"
    )


def build_comment_text(comment: str, missing_information: List[str], repo: str) -> str:
    """Sanitized comment text for an issue that is missing information."""
    text = sanitize_comment(comment, repo)
    if not text:
        text = sanitize_comment(fallback_comment(missing_information), repo)
    return text
