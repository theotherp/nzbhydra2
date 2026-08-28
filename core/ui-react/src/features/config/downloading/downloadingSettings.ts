import type {ConfigFieldPath, SettingOption} from "../components";

/**
 * `F-CONFIG-DOWNLOADING`'s vocabulary-independent data: legacy's three add
 * presets, its option lists, the per-downloader-type field sets, and the two
 * shapes the backend is strict about. Kept out of the components so the parity
 * comparison against `formly-downloaders.js` is a comparison of data, not of
 * JSX.
 */

/** The list of downloaders inside `C-CONFIG-FORM`'s whole-config form. */
export const DOWNLOADERS_PATH: ConfigFieldPath = "downloading.downloaders";

/** The `data-testid` stem shared by the list's own elements. */
export const DOWNLOADERS_TEST_ID = "downloading-downloaders";

/**
 * The path the edit dialog's *draft* form binds to. It is deliberately not
 * `downloading.downloaders.<index>`: the draft lives in its own throwaway form
 * (see `DownloaderDialog`), and reusing an index path would give the dialog's
 * controls the same `data-testid`s as the list row behind it.
 */
export const DOWNLOADER_DRAFT_PATH = "downloading.downloaderDraft";

/** `downloading.downloaders.<index>.<field>` for a row of the list. */
export function downloaderFieldPath(
    index: number,
    field: string,
): ConfigFieldPath {
    return `${DOWNLOADERS_PATH}.${index}.${field}` as ConfigFieldPath;
}

/** `downloading.downloaderDraft.<field>` for a control in the edit dialog. */
export function draftFieldPath(field: string): ConfigFieldPath {
    return `${DOWNLOADER_DRAFT_PATH}.${field}` as ConfigFieldPath;
}

/**
 * A downloader entry as it travels between the form, the dialog, and the
 * connection check. It stays an open record on purpose: `ConfigWeb.setConfig`
 * writes the whole file back, so a key this UI has no control for must survive
 * an edit untouched (ADR-0003).
 */
export type DownloaderValues = Record<string, unknown>;

/**
 * Legacy's three presets, verbatim from `formly-downloaders.js:14-44`,
 * including the values `DownloaderConfig` has no field for (`nzbAccessType`,
 * which the backend silently ignores) and the ones only some of them carry
 * (only NZBGet and SABnzbd seed `addPaused`). `addEntry` starts every new
 * entry from `{enabled: true}` before extending it with the preset
 * (`formly-downloaders.js:91-98`), which is what `newDownloaderDraft` does.
 */
export type DownloaderPreset = {
    /** Legacy's `preset.name`, which is both the menu label and the seeded name. */
    label: string;
    seed: DownloaderValues;
    /** `downloaderType`, used for the menu option's `data-testid`. */
    value: string;
};

export const DOWNLOADER_PRESETS: readonly DownloaderPreset[] = [
    {
        label: "NZBGet",
        value: "NZBGET",
        seed: {
            name: "NZBGet",
            downloaderType: "NZBGET",
            username: "nzbgetx",
            nzbAddingType: "UPLOAD",
            nzbAccessType: "REDIRECT",
            iconCssClass: "",
            downloadType: "NZB",
            addPaused: false,
            url: "http://nzbget:tegbzn6789@localhost:6789",
        },
    },
    {
        label: "SABnzbd",
        value: "SABNZBD",
        seed: {
            url: "http://localhost:8080",
            downloaderType: "SABNZBD",
            name: "SABnzbd",
            nzbAddingType: "UPLOAD",
            nzbAccessType: "REDIRECT",
            iconCssClass: "",
            addPaused: false,
            downloadType: "NZB",
        },
    },
    {
        label: "Torbox",
        value: "TORBOX",
        seed: {
            downloaderType: "TORBOX",
            name: "Torbox",
            nzbAddingType: "UPLOAD",
            nzbAccessType: "PROXY",
            iconCssClass: "",
            downloadType: "NZB",
            defaultCategory: "Use no category",
        },
    },
];

function downloaderPreset(value: string): DownloaderPreset | undefined {
    return DOWNLOADER_PRESETS.find((preset) => preset.value === value);
}

/** `formly-downloaders.js:91-98`: `{enabled: true}` extended with the preset. */
export function newDownloaderDraft(presetValue: string): DownloaderValues {
    return {enabled: true, ...(downloaderPreset(presetValue)?.seed ?? {})};
}

/**
 * The entry as it is committed into the form and posted to the connection
 * check. Only two things are normalized, and both are forced by the backend
 * rather than chosen here: `enabled` and `addPaused` are `boolean` primitives
 * of a Lombok `@AllArgsConstructor` type, so Jackson rejects a
 * `DownloaderConfig` that omits either of them with HTTP 400 — both on
 * `PUT /internalapi/config` and on the connection check, verified against the
 * running backend. Legacy's Torbox preset seeds no `addPaused` at all, which is
 * why adding a Torbox downloader there makes the *whole* config unsavable;
 * defaulting it to `false` here (the value the backend itself stores for every
 * other entry) is the smallest correction that makes the tab usable.
 *
 * Everything else is passed through untouched, so unmodeled keys survive.
 */
export function downloaderEntry(draft: DownloaderValues): DownloaderValues {
    return {
        ...draft,
        addPaused: draft.addPaused === true,
        enabled: draft.enabled === true,
    };
}

export function downloadersOf(config: unknown): DownloaderValues[] {
    return Array.isArray(config) ? (config as DownloaderValues[]) : [];
}

export function asDownloader(entry: unknown): DownloaderValues {
    return typeof entry === "object" && entry !== null
        ? (entry as DownloaderValues)
        : {};
}

export function downloaderText(value: unknown): string {
    return typeof value === "string" ? value : "";
}

/** The heading a list row and the dialog show; legacy shows `model.name`. */
const UNNAMED_DOWNLOADER = "Downloader";

export function downloaderLegend(entry: DownloaderValues): string {
    const name = downloaderText(entry.name);
    return name === "" ? UNNAMED_DOWNLOADER : name;
}

/**
 * `DownloaderConfig.downloaderType` as a reader sees it, mirroring
 * `indexerSettings.ts`'s `INDEXER_TYPE_LABELS`: the table showed the raw enum
 * constant (`NZBGET`) before FM-118, which is exactly the inconsistency the
 * table was written to remove (ADR-0033).
 */
const DOWNLOADER_TYPE_LABELS: Readonly<Record<string, string>> = {
    NZBGET: "NZBGet",
    SABNZBD: "SABnzbd",
    TORBOX: "Torbox",
};

/** Shown when an entry carries no type at all; nothing else would be true. */
const UNKNOWN_DOWNLOADER_TYPE = "Unknown";

export function downloaderTypeLabel(downloaderType: unknown): string {
    const type = downloaderText(downloaderType);
    if (type === "") {
        return UNKNOWN_DOWNLOADER_TYPE;
    }
    return (
        DOWNLOADER_TYPE_LABELS[type] ??
        type
            .split("_")
            .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
            .join(" ")
    );
}

/** The table's URL cell has no value to show for it. */
const NO_URL = "Not applicable";

/**
 * The table's URL column. Torbox carries no `url` at all
 * (`visibleDownloaderFields` never offers the field, and its preset seeds no
 * key for it), so `downloaderText(entry.url)` alone would render an empty
 * cell indistinguishable from a bug — a reader cannot tell "not applicable"
 * from "not typed in yet". Every other type always has the field, even when
 * blank, so an empty string there is a genuinely unset URL and is shown as
 * one.
 */
export function downloaderUrlDisplay(entry: DownloaderValues): string {
    if (downloaderText(entry.downloaderType) === "TORBOX") {
        return NO_URL;
    }
    return downloaderText(entry.url);
}

/**
 * The editable fields of a downloader, in legacy's order
 * (`getDownloaderBoxFields`). `enabled` and `iconCssClass` apply to every type;
 * the rest are filtered by `showFor`/`hideFor`
 * (`formly-downloaders.js:271-280`) plus the `if` that decides between an API
 * key and a username/password pair (`:168-216`).
 */
export type DownloaderField =
    | "addPaused"
    | "apiKey"
    | "defaultCategory"
    | "enabled"
    | "iconCssClass"
    | "name"
    | "nzbAddingType"
    | "password"
    | "url"
    | "username";

export function visibleDownloaderFields(
    downloaderType: unknown,
): readonly DownloaderField[] {
    const type = downloaderText(downloaderType);
    const fields: DownloaderField[] = ["enabled"];
    if (type !== "TORBOX") {
        fields.push("name");
        fields.push("url");
    }
    if (type === "SABNZBD" || type === "TORBOX") {
        fields.push("apiKey");
    } else if (type === "NZBGET") {
        fields.push("username", "password");
    }
    if (type !== "TORBOX") {
        fields.push("defaultCategory", "nzbAddingType", "addPaused");
    }
    fields.push("iconCssClass");
    return fields;
}

/**
 * The fields whose change makes legacy re-run the connection check before
 * closing the box (the `watcher` listeners that set `needsConnectionTest`,
 * `formly-downloaders.js:157-215`). A brand-new entry is always checked
 * (`DownloaderCheckBeforeCloseService.checkBeforeClose`'s `isInitial`).
 */
const CONNECTION_FIELDS = ["url", "apiKey", "username", "password"] as const;

export function connectionSettingsChanged(
    initial: DownloaderValues,
    current: DownloaderValues,
): boolean {
    return CONNECTION_FIELDS.some((field) => initial[field] !== current[field]);
}

/** `config-fields-service.js:1869-1872`. */
export const NZB_ACCESS_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Proxy NZBs from indexer", value: "PROXY"},
    {label: "Redirect to the indexer", value: "REDIRECT"},
];

/** `config-fields-service.js:1901-1906`. */
export const FALLBACK_FOR_FAILED_OPTIONS: readonly SettingOption[] = [
    {label: "GUI downloads", value: "INTERNAL"},
    {label: "API downloads", value: "API"},
    {label: "All downloads", value: "BOTH"},
    {label: "Never", value: "NONE"},
];

/** `formly-downloaders.js:237-240`. */
export const NZB_ADDING_TYPE_OPTIONS: readonly SettingOption[] = [
    {label: "Send link", value: "SEND_LINK"},
    {label: "Upload NZB", value: "UPLOAD"},
];

/**
 * `config-fields-service.js:1951-1957`: the select offers the *configured*
 * downloaders' names, enabled or not. A stored value naming a downloader that
 * no longer exists is kept as an option of its own so the select never
 * silently rewrites it.
 */
export function primaryDownloaderOptions(
    downloaders: DownloaderValues[],
    current: unknown,
): SettingOption[] {
    const options = downloaders
        .map((downloader) => downloaderText(downloader.name))
        .filter((name) => name !== "")
        .map((name) => ({label: name, value: name}));
    const currentName = downloaderText(current);
    if (
        currentName !== "" &&
        !options.some((option) => option.value === currentName)
    ) {
        options.push({label: currentName, value: currentName});
    }
    return options;
}

/**
 * `config-fields-service.js:1882-1886`: the external URL matters as soon as
 * either the footer is shown (it is the icon's link target) or some downloader
 * is fed links rather than NZB data.
 */
export function showsExternalUrl(
    showDownloaderStatus: unknown,
    downloaders: DownloaderValues[],
): boolean {
    return (
        showDownloaderStatus === true ||
        downloaders.some(
            (downloader) => downloader.nzbAddingType === "SEND_LINK",
        )
    );
}

/** `config-fields-service.js:1943-1945`. */
export function showsPrimaryDownloader(
    showDownloaderStatus: unknown,
    downloaders: DownloaderValues[],
): boolean {
    return (
        showDownloaderStatus === true &&
        downloaders.filter((downloader) => downloader.enabled === true).length >
            1
    );
}
