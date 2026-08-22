import {Link} from "@mui/material";

import {externalLink} from "../../domain/links/externalLinks";

/**
 * `C-EXTERNAL-LINKS`' policy for the fixed external targets the startup
 * dialogs mention. A target the dereferer cannot produce a usable URL for
 * renders as plain text rather than as a live link, the same rule
 * `SystemAboutTab` and `SettingHelp` follow.
 */
export function ExternalTextLink({
    children,
    dereferer,
    url,
}: {
    children: React.ReactNode;
    dereferer: unknown;
    url: string;
}) {
    const href = externalLink(url, dereferer);
    if (href === undefined) {
        return <>{children}</>;
    }
    return (
        <Link href={href} rel="noreferrer" target="_blank">
            {children}
        </Link>
    );
}
