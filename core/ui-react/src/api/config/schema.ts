import {z} from "zod";

/**
 * The hand-written whole-`BaseConfig` envelope (ADR-0003: generated types are
 * not the runtime contract — every field in the generated `BaseConfig` is
 * optional and none of them is validated).
 *
 * The single hard requirement of this envelope is that it is **lossless**.
 * `ConfigWeb.setConfig` replaces the entire configuration file on every save
 * (`ConfigWeb.java:94`), so any key this schema dropped on parse would be
 * deleted from the user's config the next time the form is submitted. Every
 * object schema below is therefore a `looseObject`, which keeps unrecognized
 * keys in its output:
 *
 * - sections no tab models — `emby`, `genericStorage` (`BaseConfig.java:47`,
 *   `:53`) — are not named here at all and survive as unknown keys of the
 *   top-level loose object;
 * - keys a newer backend adds inside a modeled section survive because that
 *   section is loose too;
 * - `indexers` entries survive whole, including per-indexer keys this UI has
 *   no vocabulary for.
 *
 * The sections are named (rather than left implicit) only to assert their
 * shape — object, or an array of objects for `indexers` — so the config form
 * can rely on them existing. Field-level modeling deliberately does not happen
 * here: FM-059 onwards own the typed field vocabulary, and a field modeled
 * with the wrong type would reject a legitimate config outright.
 */
const configSection = z.looseObject({});

export const configSchema = z.looseObject({
    auth: configSection.optional(),
    categoriesConfig: configSection.optional(),
    downloading: configSection.optional(),
    externalTools: configSection.optional(),
    indexers: z.array(configSection).optional(),
    main: configSection.optional(),
    notificationConfig: configSection.optional(),
    searching: configSection.optional(),
});

export type ConfigValues = z.infer<typeof configSchema>;

/**
 * `ConfigValidationResult` (`shared/mapping/.../validation/
 * ConfigValidationResult.java`). `newConfig` is only populated when the server
 * actually persisted the configuration (`ConfigWeb.java:96`) and is the only
 * value the form may reset from: the server normalizes the config and re-masks
 * secrets through `SensitiveDataConfigValidator.prepareForDisplay`, so the
 * submitted values are not what is now on disk.
 */
export const configValidationResultSchema = z.looseObject({
    errorMessages: z.array(z.string()).nullish(),
    newConfig: configSchema.nullish(),
    ok: z.boolean(),
    restartNeeded: z.boolean().nullish(),
    warningMessages: z.array(z.string()).nullish(),
});

export type ConfigValidationResult = {
    errorMessages: string[];
    newConfig?: ConfigValues;
    ok: boolean;
    restartNeeded: boolean;
    warningMessages: string[];
};

export const apiHelpSchema = z.looseObject({
    apiKey: z.string().nullish(),
    newznabApi: z.string().nullish(),
    torznabApi: z.string().nullish(),
});

export type ApiHelp = {
    apiKey: string;
    newznabApi: string;
    torznabApi: string;
};

export class MalformedConfigResponseError extends Error {
    constructor(what: string) {
        super(`The ${what} response has an invalid format`);
    }
}

export function parseConfig(value: unknown): ConfigValues {
    const parsed = configSchema.safeParse(value);
    if (!parsed.success) {
        throw new MalformedConfigResponseError("configuration");
    }
    return parsed.data;
}

export function parseConfigValidationResult(
    value: unknown,
): ConfigValidationResult {
    const parsed = configValidationResultSchema.safeParse(value);
    if (!parsed.success) {
        throw new MalformedConfigResponseError("configuration save");
    }
    const {errorMessages, newConfig, ok, restartNeeded, warningMessages} =
        parsed.data;
    return {
        errorMessages: errorMessages ?? [],
        ...(newConfig ? {newConfig} : {}),
        ok,
        restartNeeded: restartNeeded === true,
        warningMessages: warningMessages ?? [],
    };
}

export function parseApiHelp(value: unknown): ApiHelp {
    const parsed = apiHelpSchema.safeParse(value);
    if (!parsed.success) {
        throw new MalformedConfigResponseError("API help");
    }
    return {
        apiKey: parsed.data.apiKey ?? "",
        newznabApi: parsed.data.newznabApi ?? "",
        torznabApi: parsed.data.torznabApi ?? "",
    };
}
