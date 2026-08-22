import {z} from "zod";

import {ApiTransport} from "../transport";

const INFOS_PATH = "internalapi/updates/infos";
const SIMPLE_INFOS_PATH = "internalapi/updates/simpleInfos";
const VERSION_HISTORY_PATH = "internalapi/updates/versionHistory";
const CHANGES_SINCE_PATH = "internalapi/updates/changesSince";
const INSTALL_PATH = "internalapi/updates/installUpdate";
const MESSAGES_PATH = "internalapi/updates/messages";
const WRAPPER_STATUS_PATH = "internalapi/updates/isDisplayWrapperOutdated";
const ACK_WRAPPER_PATH =
    "internalapi/updates/setOutdatedWrapperDetectedWarningShown";

/**
 * `PackageInfo` (`core/src/.../update/PackageInfo.java`): only present when the
 * instance was built into a container or distribution package, which is what
 * makes legacy's About block conditional (`about.html:10-14`).
 */
const packageInfoSchema = z.looseObject({
    author: z.string().nullish(),
    releaseType: z.string().nullish(),
    version: z.string().nullish(),
});

/**
 * `VersionsInfo` (`UpdatesWeb`): every field is optional in the generated
 * schema, and the no-update-check case really does answer a bare `new
 * VersionsInfo()`, so each flag is validated here and normalized to the
 * booleans the page branches on.
 */
const versionsInfoSchema = z.looseObject({
    betaUpdateAvailable: z.boolean().nullish(),
    betaVersion: z.string().nullish(),
    betaVersionsEnabled: z.boolean().nullish(),
    currentVersion: z.string().nullish(),
    latestVersion: z.string().nullish(),
    latestVersionIgnored: z.boolean().nullish(),
    latestVersionIsBeta: z.boolean().nullish(),
    packageInfo: packageInfoSchema.nullish(),
    showUpdateBannerOnUpdatedExternally: z.boolean().nullish(),
    updateAvailable: z.boolean().nullish(),
    updatedExternally: z.boolean().nullish(),
    wrapperOutdated: z.boolean().nullish(),
});

const changelogEntrySchema = z.looseObject({
    changes: z
        .array(
            z.looseObject({
                text: z.string().nullish(),
                type: z.string().nullish(),
            }),
        )
        .nullish(),
    date: z.string().nullish(),
    final: z.boolean().nullish(),
    version: z.string().nullish(),
});

const changelogSchema = z.array(changelogEntrySchema);

const messagesSchema = z.array(z.string());

export type PackageInfo = {
    author: string | null;
    releaseType: string | null;
    version: string | null;
};

export type UpdateInfos = {
    betaUpdateAvailable: boolean;
    betaVersion: string | null;
    betaVersionsEnabled: boolean;
    currentVersion: string | null;
    latestVersion: string | null;
    latestVersionIgnored: boolean;
    latestVersionIsBeta: boolean;
    packageInfo: PackageInfo | null;
    showUpdateBannerOnUpdatedExternally: boolean;
    updateAvailable: boolean;
    updatedExternally: boolean;
    wrapperOutdated: boolean;
};

export type SimpleUpdateInfos = {
    currentVersion: string | null;
    packageInfo: PackageInfo | null;
};

/** A single changelog line; `text` is server-authored HTML (`changelog.md`). */
export type ChangelogChange = {
    text: string;
    type: string | null;
};

export type ChangelogEntry = {
    changes: ChangelogChange[];
    date: string | null;
    /** `false` marks a beta release; legacy prints " Beta" for it. */
    final: boolean;
    version: string | null;
};

export class MalformedUpdateResponseError extends Error {
    constructor() {
        super("The update response has an invalid format");
    }
}

/** `API-UPDATES-INFOS`: everything the Updates tab branches on. */
export async function getUpdateInfos(
    transport: ApiTransport,
): Promise<UpdateInfos> {
    return parseUpdateInfos(await transport.request<unknown>(INFOS_PATH));
}

/**
 * `API-UPDATES-SIMPLE-INFOS`: the current version and the optional package
 * info, without the (network-bound) update check `API-UPDATES-INFOS` performs.
 */
export async function getSimpleUpdateInfos(
    transport: ApiTransport,
): Promise<SimpleUpdateInfos> {
    const infos = parseUpdateInfos(
        await transport.request<unknown>(SIMPLE_INFOS_PATH),
    );
    return {
        currentVersion: infos.currentVersion,
        packageInfo: infos.packageInfo,
    };
}

/** `API-UPDATES-VERSION-HISTORY`: every released change up to this version. */
export async function getVersionHistory(
    transport: ApiTransport,
): Promise<ChangelogEntry[]> {
    return parseChangelog(
        await transport.request<unknown>(VERSION_HISTORY_PATH),
    );
}

/** `API-UPDATES-CHANGES`: the changes between this version and `version`. */
export async function getChangesSince(
    transport: ApiTransport,
    version: string,
): Promise<ChangelogEntry[]> {
    return parseChangelog(
        await transport.request<unknown>(
            `${CHANGES_SINCE_PATH}/${encodeURIComponent(version)}`,
        ),
    );
}

/**
 * `API-UPDATES-INSTALL`: downloads and applies the update, then restarts the
 * instance on its own. It answers only once that work is done, which is why
 * the caller polls `API-UPDATES-MESSAGES` for progress in the meantime.
 */
export async function installUpdate(
    transport: ApiTransport,
    version: string,
): Promise<void> {
    await transport.request<unknown>(
        `${INSTALL_PATH}/${encodeURIComponent(version)}`,
        {method: "PUT"},
    );
}

/** `API-UPDATES-MESSAGES`: the running install's progress lines. */
export async function getUpdateMessages(
    transport: ApiTransport,
): Promise<string[]> {
    const parsed = messagesSchema.safeParse(
        await transport.request<unknown>(MESSAGES_PATH),
    );
    if (!parsed.success) {
        throw new MalformedUpdateResponseError();
    }
    return parsed.data;
}

export function parseUpdateInfos(response: unknown): UpdateInfos {
    const parsed = versionsInfoSchema.safeParse(response);
    if (!parsed.success) {
        throw new MalformedUpdateResponseError();
    }
    const data = parsed.data;
    return {
        betaUpdateAvailable: data.betaUpdateAvailable === true,
        betaVersion: data.betaVersion ?? null,
        betaVersionsEnabled: data.betaVersionsEnabled === true,
        currentVersion: data.currentVersion ?? null,
        latestVersion: data.latestVersion ?? null,
        latestVersionIgnored: data.latestVersionIgnored === true,
        latestVersionIsBeta: data.latestVersionIsBeta === true,
        packageInfo: parsePackageInfo(data.packageInfo),
        showUpdateBannerOnUpdatedExternally:
            data.showUpdateBannerOnUpdatedExternally === true,
        updateAvailable: data.updateAvailable === true,
        updatedExternally: data.updatedExternally === true,
        wrapperOutdated: data.wrapperOutdated === true,
    };
}

/**
 * `API-UPDATES-WRAPPER-STATUS`: whether the wrapper scripts around this
 * instance are outdated *and* the warning has not been acknowledged yet. Only
 * a literal `true` (as a JSON boolean or its text form, since the operation
 * is declared without a JSON content type) counts; anything else leaves the
 * warning unshown.
 */
export async function isWrapperOutdated(
    transport: ApiTransport,
): Promise<boolean> {
    const response = await transport.request<unknown>(WRAPPER_STATUS_PATH);
    return response === true || response === "true";
}

/** `API-UPDATES-ACK-WRAPPER`: never warn about this wrapper version again. */
export async function acknowledgeWrapperOutdated(
    transport: ApiTransport,
): Promise<void> {
    await transport.request<unknown>(ACK_WRAPPER_PATH, {method: "PUT"});
}

export function parseChangelog(response: unknown): ChangelogEntry[] {
    const parsed = changelogSchema.safeParse(response);
    if (!parsed.success) {
        throw new MalformedUpdateResponseError();
    }
    return parsed.data.map((entry) => ({
        // A change without text renders nothing at all, so it is dropped
        // rather than kept as an empty badge-only row.
        changes: (entry.changes ?? [])
            .filter((change) => typeof change.text === "string")
            .map((change) => ({
                text: change.text as string,
                type: change.type ?? null,
            })),
        date: entry.date ?? null,
        // `final` is the beta marker's inverse: legacy prints " Beta" for
        // `ng-if="!entry.final"`, which is also true for an absent value.
        final: entry.final === true,
        version: entry.version ?? null,
    }));
}

function parsePackageInfo(
    value: z.infer<typeof packageInfoSchema> | null | undefined,
): PackageInfo | null {
    if (value === null || value === undefined) {
        return null;
    }
    return {
        author: value.author ?? null,
        releaseType: value.releaseType ?? null,
        version: value.version ?? null,
    };
}
