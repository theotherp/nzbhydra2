import {z} from "zod";

import {ApiTransport} from "../transport";

/**
 * `API-CONFIG-CUSTOM-MAPPING-TEST`: runs one custom query/title mapping
 * against an example input so the admin can see what it would produce before
 * keeping it (`CustomQueryAndTitleMappingHandler.testMapping`, legacy
 * `formly-config.js` `customMappingTest`).
 *
 * The request carries the *edited* mapping — including its match-whole-string
 * flag, which is what decides whether the input pattern has to match the whole
 * value or only part of it — so the round trip tests what is on screen, not
 * what is saved. Nothing about the configuration is changed by it: the handler
 * builds a throwaway `MetaData` (season 1, episode 2) and forces
 * `affectedValue` to `QUERY` for the test only.
 */

/** One entry of `SearchingConfig.customMappings` (`CustomQueryAndTitleMapping`). */
export type CustomMappingValues = {
    affectedValue: string | null;
    from: string | null;
    matchAll: boolean;
    searchType: string | null;
    to: string | null;
};

/**
 * `CustomQueryAndTitleMappingHandler.TestResponse`. `isMatch` is a `boolean`
 * field whose Lombok getter is `isMatch()`, so Jackson names the JSON property
 * `match` — which is the name legacy reads (`response.data.match`).
 */
const testResponseSchema = z.looseObject({
    error: z.string().nullish(),
    match: z.boolean().nullish(),
    output: z.string().nullish(),
});

/**
 * The three answers the endpoint gives, kept apart rather than flattened into
 * one string: legacy's modal decided between them inline and the distinction
 * is the whole point of the affordance.
 */
export type CustomMappingTestResult =
    | {kind: "error"; message: string}
    | {kind: "match"; output: string}
    | {kind: "noMatch"};

export async function testCustomMapping(
    transport: ApiTransport,
    request: {exampleInput: string; mapping: CustomMappingValues},
): Promise<CustomMappingTestResult> {
    const response = await transport.request<unknown>(
        "internalapi/customMapping/test",
        {json: request, method: "POST"},
    );
    return interpretCustomMappingTest(response);
}

/**
 * Legacy's branch order (`formly-config.js:371-377`): an error wins over a
 * match, and anything else is "the mapping does not apply". A response this
 * build cannot parse is reported as an error rather than silently read as
 * "does not match", which would tell the admin their mapping is wrong when the
 * server never said so.
 */
export function interpretCustomMappingTest(
    value: unknown,
): CustomMappingTestResult {
    const parsed = testResponseSchema.safeParse(value);
    if (!parsed.success) {
        return {
            kind: "error",
            message: "The mapping test response has an invalid format",
        };
    }
    const {error, match, output} = parsed.data;
    if (error !== null && error !== undefined && error !== "") {
        return {kind: "error", message: error};
    }
    if (match === true) {
        return {kind: "match", output: output ?? ""};
    }
    return {kind: "noMatch"};
}
