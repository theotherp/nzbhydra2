import DOMPurify from "dompurify";

type SafeRichContentProps = {
    html: string;
};

const ALLOWED_URI_REGEXP = /^(?:(?:https?):|[/?#]|\.{1,2}\/)/i;

export function SafeRichContent({html}: SafeRichContentProps) {
    const sanitizedHtml = DOMPurify.sanitize(html, {
        ALLOWED_ATTR: ["href", "rel", "target", "title"],
        ALLOWED_TAGS: [
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
        ALLOWED_URI_REGEXP,
        RETURN_TRUSTED_TYPE: false,
    });

    return (
        <div
            data-testid="safe-rich-content"
            dangerouslySetInnerHTML={{__html: sanitizedHtml}}
        />
    );
}
