import {Link} from "@mui/material";
import {Fragment} from "react";

import {externalLink} from "../../../domain/links/externalLinks";
import {useDereferer, type HelpContent} from "./settings";

/**
 * A setting's help text. Legacy stores it as an HTML fragment and renders it
 * with `ng-bind-html="to.help | derefererExtracting | unsafe"`
 * (`setting-wrapper.html`), which both interprets the fragment as markup and
 * rewrites the first URL in it through the configured dereferer
 * (`nzbhydra.js#derefererExtracting`).
 *
 * Here the same content is a typed list of text runs and links: the text is
 * always rendered as text, and a link's `href` is always produced by
 * `C-EXTERNAL-LINKS` (`externalLink`), which applies the dereferer and rejects
 * any non-`http(s)` scheme. A link whose target `externalLink` refuses stays
 * visible as its own label rather than silently disappearing.
 */
export function SettingHelp({content}: {content: HelpContent}) {
    const dereferer = useDereferer();
    if (typeof content === "string") {
        return content;
    }
    return content.map((part, index) => {
        if (typeof part === "string") {
            return <Fragment key={index}>{part}</Fragment>;
        }
        const href = externalLink(part.href, dereferer);
        return href === undefined ? (
            <Fragment key={index}>{part.text}</Fragment>
        ) : (
            <Link href={href} key={index} rel="noopener" target="_blank">
                {part.text}
            </Link>
        );
    });
}
