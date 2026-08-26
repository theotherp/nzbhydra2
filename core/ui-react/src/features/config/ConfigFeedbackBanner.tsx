import {Alert, AlertTitle, Box, Link, Stack} from "@mui/material";

import {settingTestId} from "./components/settings";
import {configTabForSectionKey} from "./configFormState";
import {CONFIG_TABS} from "./configTabs";
import {
    SETTINGS_INDEX,
    settingsIndexTab,
    type SettingsIndexEntry,
} from "./settingsSearch/settingsIndex";

/**
 * `F-CONFIG-SHELL`'s save-feedback region: what the two validation
 * acknowledge dialogs used to say, said in place instead.
 *
 * Save feedback is a *report*, not a question. The dialogs demanded a click
 * that carried no decision, hid the settings they were talking about behind a
 * backdrop, and were gone the moment they were dismissed — so an admin fixing
 * four rejected settings had nothing left to work from. The restart prompt and
 * the unsaved-changes guard stay modal precisely because they do ask something
 * (FM-101's Out Of Scope).
 *
 * Presentational by construction: it is handed the strings the server sent and
 * the form's own error tree, and reports a click on one of the settings it
 * names. It holds no state, so "the banner survived a tab switch" is a
 * property of where the shell mounts it, not of anything here.
 *
 * Severity is never the only difference between the two banners: each carries
 * its own title and its own intro sentence, and MUI's own `error`/`warning`
 * icons differ in glyph as well as in hue (ADR-0014).
 */

/**
 * Where the report is being rendered, which decides only how a link is
 * coloured. `"standard"` is the in-place banner, on the theme's own tinted
 * error surface, where the link keeps its usual primary colour. `"filled"` is
 * the toast surface `C-TOAST-SERVICE` renders on — a solid error fill, where a
 * primary-coloured link would sit at roughly 2:1 against the background, so the
 * link takes the surface's own foreground colour and keeps its underline to
 * stay distinguishable without it (ADR-0014, WCAG 1.4.1).
 */
export type ConfigReportSurface = "filled" | "standard";

/** One entry of the client-side invalid list. */
type ConfigInvalidField = {
    /**
     * What clicking it navigates to, or `null` when the path belongs to no
     * navigable tab (a section of `BaseConfig` no tab models). Such an entry
     * is still reported — it is a real reason the save was refused — but as
     * plain text, because there is nowhere honest to send the admin.
     */
    entry: SettingsIndexEntry | null;
    /** `config-invalid-field-<path testid>`. */
    testId: string;
    /** `"<Tab> › <label>: <message>"`. */
    text: string;
};

/** Props shared by the in-place banner and the stacked copy over FM-100's panel. */
type ConfigErrorReportProps = {
    /** `ConfigValidationResult.errorMessages`, plus its warning lines. */
    errorMessages: readonly string[];
    /**
     * React Hook Form's `formState.errors` when a save attempt was refused by
     * the form itself, and `undefined` otherwise. The tree rather than a list
     * derived from it: the shell would have to derive that list on every
     * render anyway (React Hook Form mutates the tree in place, so anything
     * memoized on its identity goes stale), and turning a form error into a
     * reportable line is this component's own job.
     */
    invalidErrors?: unknown;
    onSelectField: (entry: SettingsIndexEntry) => void;
};

/**
 * Whether the two error inputs amount to anything worth reporting. Not
 * exported: the shell has to answer the same question to decide *where* to
 * render the report, and it answers it from its own state (a save the form
 * itself refused always leaves at least one error behind) rather than making
 * this file export a function next to its components.
 */
function hasConfigErrorReport({
    errorMessages,
    invalidErrors,
}: {
    errorMessages: readonly string[];
    invalidErrors?: unknown;
}): boolean {
    return (
        errorMessages.length > 0 ||
        collectInvalidFields(invalidErrors).length > 0
    );
}

/**
 * The body of the error report, without the surface it sits on.
 *
 * It is extracted from the banner because the report has to be able to render
 * on two surfaces. While FM-100's review panel is open the config area is a
 * MUI `Modal` sibling and is marked `aria-hidden`, so a report rendered in
 * place would be present in the DOM and absent from the accessibility tree —
 * and its entries, the only way FM-101 offers of *acting* on the failure,
 * would be unclickable behind the backdrop. The shell therefore relocates this
 * exact markup onto the toast surface for as long as the panel is open. One
 * definition, two surfaces: the entries, their testids and their behaviour
 * cannot drift between the two.
 */
export function ConfigErrorReport({
    errorMessages,
    invalidErrors,
    onSelectField,
    surface = "standard",
}: ConfigErrorReportProps & {surface?: ConfigReportSurface}) {
    const invalidFields = collectInvalidFields(invalidErrors);
    if (errorMessages.length === 0 && invalidFields.length === 0) {
        return null;
    }
    return (
        <>
            <AlertTitle>
                {errorMessages.length > 0
                    ? "Config validation failed"
                    : "Config invalid"}
            </AlertTitle>
            {/* The two halves cannot both be non-empty in the shell as it
                stands -- a form the client refused to submit never reaches the
                server -- but both are rendered rather than one chosen, so a
                future path that produces both reports both instead of silently
                dropping one. */}
            {errorMessages.length > 0 && (
                <>
                    The following errors have been found in your config. They
                    need to be fixed.
                    <MessageList messages={errorMessages} />
                </>
            )}
            {invalidFields.length > 0 && (
                <>
                    These settings are invalid, so nothing was sent to the
                    server. Select one to go to it.
                    <Box component="ul" sx={LIST_SX}>
                        {invalidFields.map((field) => (
                            <InvalidFieldItem
                                field={field}
                                key={field.testId}
                                onSelect={onSelectField}
                                surface={surface}
                            />
                        ))}
                    </Box>
                </>
            )}
        </>
    );
}

export function ConfigFeedbackBanner({
    errorMessages,
    invalidErrors,
    onDismissErrors,
    onDismissWarnings,
    onSelectField,
    warningMessages,
}: ConfigErrorReportProps & {
    onDismissErrors: () => void;
    onDismissWarnings: () => void;
    /** `warningMessages` of a config that *was* saved. */
    warningMessages: readonly string[];
}) {
    const hasErrors = hasConfigErrorReport({errorMessages, invalidErrors});
    if (!hasErrors && warningMessages.length === 0) {
        return null;
    }
    return (
        <Stack spacing={2} sx={{pt: 3}}>
            {hasErrors && (
                <Alert
                    data-testid="config-validation-errors"
                    onClose={onDismissErrors}
                    severity="error"
                >
                    <ConfigErrorReport
                        errorMessages={errorMessages}
                        invalidErrors={invalidErrors}
                        onSelectField={onSelectField}
                    />
                </Alert>
            )}
            {warningMessages.length > 0 && (
                <Alert
                    data-testid="config-validation-warnings"
                    onClose={onDismissWarnings}
                    severity="warning"
                >
                    <AlertTitle>Config validation warnings</AlertTitle>
                    The following warnings have been found. You can ignore them
                    if you wish. The config was already saved.
                    <MessageList messages={warningMessages} />
                </Alert>
            )}
        </Stack>
    );
}

/**
 * The list indent, in theme spacing rather than the user agent's own `40px`:
 * a `<ul>` inside an `Alert` would otherwise hang its bullets on a padding
 * value that no other margin in the application shares. Not a design literal.
 */
const LIST_SX = {mb: 0, mt: 1, pl: 3} as const;

function InvalidFieldItem({
    field,
    onSelect,
    surface,
}: {
    field: ConfigInvalidField;
    onSelect: (entry: SettingsIndexEntry) => void;
    surface: ConfigReportSurface;
}) {
    const {entry, testId, text} = field;
    if (entry === null) {
        return <li data-testid={testId}>{text}</li>;
    }
    return (
        <li>
            <Link
                color={surface === "filled" ? "inherit" : "primary"}
                component="button"
                data-testid={testId}
                onClick={() => onSelect(entry)}
                // A `Link` rendered as a button is an inline-block with
                // centred text, and neither survives a list item at 390px: the
                // entry wraps to two lines, and an inline-block that wraps puts
                // its *last* line on the item's baseline, so the bullet ended
                // up beside the second line with the first hanging above it
                // (seen in the first `validation-invalid-fields-mobile`
                // capture). As a block the marker aligns with the first line,
                // and the text reads left-aligned like the message lists above
                // it.
                sx={{display: "block", textAlign: "left"}}
                type="button"
            >
                {text}
            </Link>
        </li>
    );
}

function MessageList({messages}: {messages: readonly string[]}) {
    return (
        <Box component="ul" sx={LIST_SX}>
            {messages.map((message, index) => (
                // The server sends flat strings and may well repeat one across
                // two settings, so the position is part of the identity.
                <li key={`${String(index)}-${message}`}>{message}</li>
            ))}
        </Box>
    );
}

/**
 * The settings React Hook Form found invalid, flattened out of
 * `formState.errors` into one reportable line each.
 *
 * Recomputed on every render rather than memoized on the error tree: React
 * Hook Form mutates `errors` in place as often as it replaces it, so an
 * identity-keyed `useMemo` here would keep listing a setting the admin has
 * already fixed (the same hazard `ConfigShell`'s badge derivations document).
 * The walk is over a config-sized object.
 */
function collectInvalidFields(errors: unknown): ConfigInvalidField[] {
    const fields = collectFieldErrors(errors, []).map(
        ({message, path}): ConfigInvalidField => {
            const exact = SETTINGS_INDEX.find((entry) => entry.path === path);
            const label = exact?.label ?? path;
            const tabLabel = exact
                ? settingsIndexTab(exact).label
                : (tabLabelForPath(path) ?? null);
            return {
                // A path with no row of its own -- a field inside a list entry
                // -- still navigates, to the list that holds it.
                entry: exact ?? enclosingIndexEntry(path),
                testId: `config-invalid-field-${settingTestId(path)}`,
                text:
                    tabLabel === null
                        ? `${label}: ${message}`
                        : `${tabLabel} › ${label}: ${message}`,
            };
        },
    );
    // Tab order, so the list reads in the order the nav offers the sections;
    // `sort` is stable, so within a tab the walk's own order survives.
    return fields.sort(
        (left, right) => tabRank(left.entry) - tabRank(right.entry),
    );
}

function tabRank(entry: SettingsIndexEntry | null): number {
    if (entry === null) {
        return CONFIG_TABS.length;
    }
    const rank = CONFIG_TABS.findIndex((tab) => tab.path === entry.tab);
    return rank === -1 ? CONFIG_TABS.length : rank;
}

/** The display name of the tab a raw form path belongs to, if any. */
function tabLabelForPath(path: string): string | undefined {
    const section = configTabForSectionKey(path.split(".")[0] ?? "");
    return CONFIG_TABS.find((tab) => tab.path === section)?.label;
}

/** The indexed entry whose own path is the longest prefix of this one. */
function enclosingIndexEntry(path: string): SettingsIndexEntry | null {
    let best: SettingsIndexEntry | null = null;
    for (const entry of SETTINGS_INDEX) {
        if (
            path.startsWith(`${entry.path}.`) &&
            (best === null || entry.path.length > best.path.length)
        ) {
            best = entry;
        }
    }
    return best;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Walks React Hook Form's error tree the way `configFormState.ts` walks it: an
 * error is recognized by its own `type`/`message` rather than by position, the
 * per-entry arrays are sparse, and `ref` holds a DOM node rather than more
 * errors. An array-level error is reported against the array itself, since
 * `root` is React Hook Form's own bookkeeping name and not a setting.
 */
function collectFieldErrors(
    node: unknown,
    path: readonly string[],
): {message: string; path: string}[] {
    if (Array.isArray(node)) {
        return node.flatMap((entry: unknown, index) =>
            entry === undefined
                ? []
                : collectFieldErrors(entry, [...path, String(index)]),
        );
    }
    if (!isRecord(node)) {
        return [];
    }
    if (typeof node.type === "string" || typeof node.message === "string") {
        return [
            {
                message:
                    typeof node.message === "string" && node.message !== ""
                        ? node.message
                        : "This setting is invalid.",
                path: path.join("."),
            },
        ];
    }
    return Object.entries(node).flatMap(([key, value]) =>
        key === "ref"
            ? []
            : collectFieldErrors(value, key === "root" ? path : [...path, key]),
    );
}
