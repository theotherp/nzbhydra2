import {z} from "zod";

import {ApiTransport} from "../transport";

/**
 * `API-CONFIG-CUSTOM-MAPPING-TEST`: runs the whole configured list of custom
 * query/title mappings — and, separately, the one being edited — against a
 * number of example inputs, so the admin can see what they would produce
 * before keeping them (`CustomQueryAndTitleMappingHandler.testMapping`).
 *
 * FM-194 replaced FM-063's single-mapping contract at the same URL with this
 * batch: the request carries the *edited* list, the index of the mapping the
 * dialog is open over, and one example per line; the response answers per line
 * with what that one mapping does (`thisMapping`) and what the whole list does
 * (`chain`), including FM-194's ordering rule — every relevant mapping top to
 * bottom, stopping after the first applied whole-string one.
 *
 * Nothing about the configuration is changed by it: the handler evaluates a
 * copy of every mapping as if it affected the query and matched the search
 * type, over a throwaway `MetaData` (season 1, episode 2), so the answer
 * describes the patterns rather than whether a given search would use them.
 */

/** One entry of `SearchingConfig.customMappings` (`CustomQueryAndTitleMapping`). */
export type CustomMappingValues = {
    affectedValue: string | null;
    /** FM-194: a mapping can be kept but switched off. True when absent. */
    enabled: boolean;
    /** FM-194: the example lines this mapping was written for, saved with it. */
    examples: string[];
    from: string | null;
    matchAll: boolean;
    /** FM-194: an optional label, used wherever a mapping has to be named. */
    name: string | null;
    searchType: string | null;
    to: string | null;
};

/**
 * `CustomQueryAndTitleMappingHandler.MAX_EXAMPLES`. More than this is answered
 * HTTP 400 unevaluated, so the client refuses before sending rather than
 * turning an admin's long example list into a failed request.
 */
const MAX_CUSTOM_MAPPING_EXAMPLES = 200;

const TOO_MANY_EXAMPLES_MESSAGE = `At most ${MAX_CUSTOM_MAPPING_EXAMPLES} example lines can be tested at once`;

/**
 * `SingleMappingResult`. `isMatch` is a `boolean` field whose Lombok getter is
 * `isMatch()`, so Jackson names the JSON property `match`.
 */
const singleMappingResultSchema = z.looseObject({
    error: z.string().nullish(),
    match: z.boolean().nullish(),
    output: z.string().nullish(),
});

/** `ChainResult`. */
const chainResultSchema = z.looseObject({
    appliedIndices: z.array(z.number()).nullish(),
    error: z.string().nullish(),
    output: z.string().nullish(),
});

/** `TestResponse`, holding one `TestResult` per example line, in order. */
const testResponseSchema = z.looseObject({
    results: z
        .array(
            z.looseObject({
                chain: chainResultSchema.nullish(),
                input: z.string().nullish(),
                thisMapping: singleMappingResultSchema.nullish(),
            }),
        )
        .nullish(),
});

/**
 * What one mapping did to one example line. Kept as three cases rather than
 * flattened into a string because the distinction is the whole point of the
 * affordance, exactly as it was in legacy's modal.
 */
export type CustomMappingOutcome =
    | {kind: "error"; message: string}
    | {kind: "match"; output: string}
    | {kind: "noMatch"};

/** What the whole list did to one example line. */
export type CustomMappingChainOutcome =
    | {appliedIndices: number[]; kind: "applied"; output: string}
    | {kind: "error"; message: string};

export type CustomMappingTestLine = {
    chain: CustomMappingChainOutcome;
    input: string;
    /**
     * `null` when the server answered no `thisMapping` for the line — which it
     * does for a `mappingIndex` outside the list it was sent. The dialog always
     * sends an index inside its own list, so this is defensive rather than a
     * state the UI produces.
     */
    thisMapping: CustomMappingOutcome | null;
};

/** The whole request either answered per line, or failed as a whole. */
export type CustomMappingTestResult =
    | {kind: "failed"; message: string}
    | {kind: "results"; lines: CustomMappingTestLine[]};

export async function testCustomMappings(
    transport: ApiTransport,
    request: {
        examples: string[];
        /** The index in `mappings` of the mapping the dialog is open over. */
        mappingIndex: number;
        mappings: CustomMappingValues[];
    },
): Promise<CustomMappingTestResult> {
    if (request.examples.length > MAX_CUSTOM_MAPPING_EXAMPLES) {
        return {kind: "failed", message: TOO_MANY_EXAMPLES_MESSAGE};
    }
    const response = await transport.request<unknown>(
        "internalapi/customMapping/test",
        {json: request, method: "POST"},
    );
    return interpretCustomMappingTest(response, request.examples);
}

/**
 * Legacy's branch order (`formly-config.js:371-377`) per line: an error wins
 * over a match, and anything else is "the mapping does not apply". A response
 * this build cannot parse is reported as a failure rather than silently read
 * as a list of non-matches, which would tell the admin their mappings are
 * wrong when the server never said so.
 *
 * `examples` is passed so a line whose `input` the server omitted is still
 * labelled with what was sent for it; the two lists are positional, which is
 * the order `TestResponse.results` is built in.
 */
function interpretCustomMappingTest(
    value: unknown,
    examples: readonly string[],
): CustomMappingTestResult {
    const parsed = testResponseSchema.safeParse(value);
    if (
        !parsed.success ||
        parsed.data.results === null ||
        parsed.data.results === undefined
    ) {
        return {
            kind: "failed",
            message: "The mapping test response has an invalid format",
        };
    }
    const results = parsed.data.results;
    return {
        kind: "results",
        lines: results.map((result, index) => ({
            chain: chainOutcome(result.chain),
            input: result.input ?? examples[index] ?? "",
            thisMapping:
                result.thisMapping === null || result.thisMapping === undefined
                    ? null
                    : singleOutcome(result.thisMapping),
        })),
    };
}

function singleOutcome(result: {
    error?: string | null;
    match?: boolean | null;
    output?: string | null;
}): CustomMappingOutcome {
    if (isText(result.error)) {
        return {kind: "error", message: result.error};
    }
    if (result.match === true) {
        return {kind: "match", output: result.output ?? ""};
    }
    return {kind: "noMatch"};
}

function chainOutcome(
    result:
        | {
              appliedIndices?: number[] | null;
              error?: string | null;
              output?: string | null;
          }
        | null
        | undefined,
): CustomMappingChainOutcome {
    if (result === null || result === undefined) {
        return {
            kind: "error",
            message: "The mapping test response has an invalid format",
        };
    }
    if (isText(result.error)) {
        return {kind: "error", message: result.error};
    }
    return {
        appliedIndices: result.appliedIndices ?? [],
        kind: "applied",
        output: result.output ?? "",
    };
}

function isText(value: string | null | undefined): value is string {
    return value !== null && value !== undefined && value !== "";
}
