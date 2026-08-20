import {describe, expect, it} from "vitest";

import {
    MalformedConfigResponseError,
    parseApiHelp,
    parseConfig,
    parseConfigValidationResult,
} from "./schema";

// A configuration carrying exactly the shapes a lossy envelope would destroy:
// two sections no tab models (`emby`, `genericStorage` — `BaseConfig.java:47`,
// `:53`), the `indexers` list, unknown keys inside a modeled section, and a
// section a future backend might add.
const config = {
    main: {
        host: "0.0.0.0",
        port: 5076,
        apiKey: "***UNCHANGED***",
        logging: {logfileLevel: "INFO"},
        aNewerBackendsSetting: {nested: [1, 2, 3], flag: false},
    },
    auth: {authType: "NONE", users: []},
    searching: {timeout: 30},
    categoriesConfig: {categories: [{name: "Movies"}]},
    downloading: {downloaders: [{name: "sab", apiKey: "***UNCHANGED***"}]},
    externalTools: {syncOnConfigChange: false},
    notificationConfig: {entries: []},
    indexers: [
        {
            name: "Mock",
            apiKey: "***UNCHANGED***",
            categoryMapping: {anime: 5070},
            somethingThisUiDoesNotModel: true,
        },
    ],
    emby: {host: "http://emby", apiKey: "***UNCHANGED***"},
    genericStorage: {someKey: "someValue"},
    aWholeNewSection: {enabled: true},
};

describe("parseConfig", () => {
    it("should pass every unmodeled section and key through unchanged", () => {
        expect(parseConfig(config)).toEqual(config);
    });

    it("should survive a parse-then-PUT round trip byte for byte", () => {
        // What the save pipeline actually does: parse what `API-CONFIG-GET`
        // returned and hand it straight to `API-CONFIG-PUT`. Because the
        // backend replaces the whole file, anything lost here is deleted from
        // the user's configuration.
        const roundTripped: unknown = JSON.parse(
            JSON.stringify(parseConfig(JSON.parse(JSON.stringify(config)))),
        );
        expect(roundTripped).toEqual(config);
    });

    it("should keep unmodeled values of every JSON type", () => {
        const payload = {
            main: {nullValue: null, zero: 0, empty: "", list: [], object: {}},
            unmodeled: {nullValue: null, nested: {deep: {deeper: [null, 1]}}},
        };
        expect(parseConfig(payload)).toEqual(payload);
    });

    it("should reject a response that is not a configuration object", () => {
        expect(() => parseConfig("nope")).toThrow(MalformedConfigResponseError);
        expect(() => parseConfig({indexers: "not-a-list"})).toThrow(
            MalformedConfigResponseError,
        );
    });
});

describe("parseConfigValidationResult", () => {
    it("should map a rejected configuration", () => {
        expect(
            parseConfigValidationResult({
                ok: false,
                restartNeeded: false,
                errorMessages: ["Port is invalid"],
                warningMessages: ["Also check this"],
                newConfig: null,
            }),
        ).toEqual({
            ok: false,
            restartNeeded: false,
            errorMessages: ["Port is invalid"],
            warningMessages: ["Also check this"],
        });
    });

    it("should keep the server's own configuration copy intact", () => {
        const result = parseConfigValidationResult({
            ok: true,
            restartNeeded: true,
            errorMessages: [],
            warningMessages: [],
            newConfig: config,
        });
        expect(result.newConfig).toEqual(config);
        expect(result.restartNeeded).toBe(true);
    });

    it("should default the optional message lists", () => {
        expect(parseConfigValidationResult({ok: true})).toEqual({
            ok: true,
            restartNeeded: false,
            errorMessages: [],
            warningMessages: [],
        });
    });

    it("should reject a response without an outcome", () => {
        expect(() => parseConfigValidationResult({})).toThrow(
            MalformedConfigResponseError,
        );
    });
});

describe("parseApiHelp", () => {
    it("should read the endpoints and the API key", () => {
        expect(
            parseApiHelp({
                newznabApi: "http://localhost:5076/",
                torznabApi: "http://localhost:5076/torznab",
                apiKey: "secret",
            }),
        ).toEqual({
            newznabApi: "http://localhost:5076/",
            torznabApi: "http://localhost:5076/torznab",
            apiKey: "secret",
        });
    });

    it("should tolerate missing values", () => {
        expect(parseApiHelp({})).toEqual({
            newznabApi: "",
            torznabApi: "",
            apiKey: "",
        });
    });
});
