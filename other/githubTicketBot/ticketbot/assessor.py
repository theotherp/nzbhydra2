"""Builds the prompt for Claude and calls the Anthropic API to assess an issue."""
from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import List, Optional

import anthropic
import pydantic
from pydantic import BaseModel

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"
SYSTEM_PROMPT_PATH = PROMPTS_DIR / "system_prompt.md"

# Anthropic-suggested max output for a small structured-output response.
MAX_TOKENS = 4000

ATTACHMENT_PATTERNS = [
    r"https://github\.com/user-attachments/files/\S+",
    r"https://github\.com/user-attachments/assets/\S+",
    r"https?://\S+\.(?:zip|log|txt)\b",
    r"https?://gist\.github\.com/\S+",
    r"https?://(?:www\.)?pastebin\.com/\S+",
    r"!\[[^\]]*\]\((\S+)\)",  # markdown images
]

_ATTACHMENT_REGEX = re.compile("|".join(f"(?:{p})" for p in ATTACHMENT_PATTERNS), re.IGNORECASE)


class Assessment(BaseModel):
    is_bug: bool
    reasoning: str
    debug_infos_attached: bool
    debug_infos_needed: bool
    missing_information: List[str]
    comment: str


class AssessmentError(RuntimeError):
    """Raised when Claude fails to produce a usable assessment for this issue
    (refusal, truncation, malformed output, transient API error)."""


class FatalAssessmentError(RuntimeError):
    """Raised for account-level API errors (bad key, no permission, unknown
    model) that no retry of a single issue will fix."""


class TransientAssessmentError(FatalAssessmentError):
    """Raised for transient Anthropic/account problems that would fail the
    same way for every issue right now: rate limits, server overload (5xx,
    including 529), connection/timeout errors, and a 400 caused by an
    exhausted credit balance. Handled the same way as FatalAssessmentError -
    abort the poll cycle without counting against the issue and without
    advancing the repo's last_poll - since retrying immediately gains
    nothing and would otherwise burn through every issue's attempt budget."""


# Account-level problems: abort the cycle instead of counting against an issue.
# BadRequestError is deliberately not here: a 400 is usually caused by the
# issue itself (e.g. too long), and must not block every other issue - except
# the specific "credit balance" case handled below, which is account-level.
FATAL_API_ERRORS = (
    anthropic.AuthenticationError,
    anthropic.PermissionDeniedError,
    anthropic.NotFoundError,
)

_ISSUE_TAG_REGEX = re.compile(r"<\s*(/?)\s*issue\s*>", re.IGNORECASE)


def neutralize_issue_tags(text: str) -> str:
    """Escapes <issue>/</issue> inside user content so it can't close the
    data block the system prompt tells Claude to treat as untrusted."""
    return _ISSUE_TAG_REGEX.sub(r"&lt;\1issue&gt;", text or "")


def load_system_prompt() -> str:
    return SYSTEM_PROMPT_PATH.read_text(encoding="utf-8")


def extract_attachments(text: str) -> List[str]:
    if not text:
        return []
    matches = _ATTACHMENT_REGEX.finditer(text)
    urls: List[str] = []
    for m in matches:
        url = m.group(0)
        # For markdown images the whole "![alt](url)" matched; pull out the URL.
        if url.startswith("!["):
            inner = re.search(r"\((\S+)\)", url)
            if inner:
                url = inner.group(1)
        if url not in urls:
            urls.append(url)
    return urls


def build_user_message(
    title: str,
    author: str,
    labels: List[str],
    body: str,
    follow_up_comments: Optional[List[str]] = None,
) -> str:
    title = neutralize_issue_tags(title)
    author = neutralize_issue_tags(author)
    labels = [neutralize_issue_tags(label) for label in labels]
    body = neutralize_issue_tags(body)
    follow_up_comments = [neutralize_issue_tags(c) for c in follow_up_comments or []]

    attachments = extract_attachments(body)
    for comment in follow_up_comments:
        attachments.extend(a for a in extract_attachments(comment) if a not in attachments)

    parts = [
        "<issue>",
        f"Title: {title}",
        f"Author: {author}",
        f"Labels: {', '.join(labels) if labels else '(none)'}",
        "Body:",
        body,
    ]
    if attachments:
        parts.append("Attachments/links found:")
        parts.extend(f"- {a}" for a in attachments)
    else:
        parts.append("Attachments/links found: (none)")

    if follow_up_comments:
        parts.append("")
        parts.append("Reporter's follow-up comments (chronological):")
        for i, comment in enumerate(follow_up_comments, 1):
            parts.append(f"--- Comment {i} ---")
            parts.append(comment)

    parts.append("</issue>")
    return "\n".join(parts)


def assess(
    client: anthropic.Anthropic,
    model: str,
    title: str,
    author: str,
    labels: List[str],
    body: str,
    follow_up_comments: Optional[List[str]] = None,
    system_prompt: Optional[str] = None,
) -> Assessment:
    """Calls Claude to assess a single issue.

    Raises FatalAssessmentError for account-level API errors,
    TransientAssessmentError (a subclass of it) for rate limits, server
    overload and connection/timeout problems that would fail identically for
    every issue right now, and AssessmentError for everything else that
    didn't yield a usable assessment.
    Note that messages.parse validates the output itself, so truncated or
    non-JSON output (including most refusals) surfaces as a pydantic
    ValidationError before stop_reason can be inspected."""
    user_message = build_user_message(title, author, labels, body, follow_up_comments)
    system_prompt = system_prompt if system_prompt is not None else load_system_prompt()

    try:
        response = client.messages.parse(
            model=model,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            output_format=Assessment,
        )
    except FATAL_API_ERRORS as e:
        raise FatalAssessmentError(f"Anthropic API rejected the request: {e}") from e
    except anthropic.APIStatusError as e:
        status = getattr(e, "status_code", None)
        message = str(e)
        if status is not None and status >= 500:
            raise TransientAssessmentError(f"Anthropic API is unavailable (status {status}): {e}") from e
        if status == 429:
            raise TransientAssessmentError(f"Anthropic rate limit: {e}") from e
        if status == 400 and "credit balance" in message.lower():
            raise TransientAssessmentError(f"Anthropic account is out of credit balance: {e}") from e
        if status == 400 and ("workspace" in message.lower() or "api key" in message.lower()):
            raise FatalAssessmentError(f"Anthropic API key/workspace is misconfigured: {e}") from e
        raise AssessmentError(f"Anthropic API error: {e}") from e
    except anthropic.APIConnectionError as e:
        raise TransientAssessmentError(f"Anthropic connection error: {e}") from e
    except pydantic.ValidationError as e:
        raise AssessmentError(f"Claude's output didn't match the expected format: {e}") from e
    except anthropic.AnthropicError as e:
        raise AssessmentError(f"Anthropic SDK error: {e}") from e

    if response.stop_reason == "refusal":
        raise AssessmentError(f"Claude refused to assess the issue: {response.stop_details}")
    if response.stop_reason == "max_tokens":
        raise AssessmentError("Claude's response was truncated (max_tokens)")

    if response.parsed_output is None:
        raise AssessmentError("Claude returned no parsed output")

    return response.parsed_output
