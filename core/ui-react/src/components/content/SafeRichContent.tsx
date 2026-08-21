import {Box} from "@mui/material";
import DOMPurify from "dompurify";

/**
 * `C-SAFE-RICH-CONTENT`'s boundaries. Each one names a place where the server
 * sends authored HTML that legacy rendered through its unrestricted `unsafe`
 * filter; the vocabulary is narrowed per boundary instead, so a new caller has
 * to declare which content it renders rather than inherit everything.
 */
export type RichContentBoundary = "changelog" | "news";

const ALLOWED_URI_REGEXP = /^(?:(?:https?):|[/?#]|\.{1,2}\/)/i;

const ALLOWED_ATTR = ["href", "rel", "target", "title"];

const BOUNDARY_TAGS: Record<RichContentBoundary, string[]> = {
    /**
     * A changelog line (`changelog.md` -> `ChangelogChangeEntry.text`) is one
     * paragraph of prose that may link an issue; legacy rendered it inline in
     * a `white-space: pre-line` span, so block structure is not part of it.
     */
    changelog: ["a", "b", "br", "code", "em", "i", "strong", "u"],
    news: [
        "a",
        "b",
        "blockquote",
        "br",
        "code",
        "del",
        "em",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "hr",
        "li",
        "ol",
        "p",
        "pre",
        "strong",
        "ul",
    ],
};

type SafeRichContentProps = {
    boundary?: RichContentBoundary;
    html: string;
};

export function SafeRichContent({
    boundary = "news",
    html,
}: SafeRichContentProps) {
    const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_ATTR,
        ALLOWED_TAGS: BOUNDARY_TAGS[boundary],
        ALLOWED_URI_REGEXP,
        RETURN_TRUSTED_TYPE: false,
    });

    return (
        <Box
            component={boundary === "changelog" ? "span" : "div"}
            data-testid="safe-rich-content"
            dangerouslySetInnerHTML={{__html: sanitizedHtml}}
            sx={boundary === "changelog" ? {whiteSpace: "pre-line"} : undefined}
        />
    );
}
