import {
    existsSync,
    mkdtempSync,
    readdirSync,
    readFileSync,
    rmSync,
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";

import {afterEach, beforeEach, describe, expect, it} from "vitest";

import {FailureArtifactReporter} from "./failureArtifactReporter";

type FakeState = "passed" | "failed";

function fakeTestCase(fullName: string, state: FakeState) {
    return {
        fullName,
        result: () =>
            state === "failed"
                ? {
                      errors: [
                          {message: `${fullName} exploded`, stack: "at x"},
                      ],
                      state: "failed" as const,
                  }
                : {errors: undefined, state: "passed" as const},
    };
}

function fakeTestModule(
    moduleId: string,
    cases: ReturnType<typeof fakeTestCase>[],
) {
    return {
        children: {
            allTests: (state?: FakeState) =>
                cases
                    .filter((c) => !state || c.result().state === state)
                    [Symbol.iterator](),
        },
        moduleId,
    };
}

describe("FailureArtifactReporter", () => {
    let outputDir: string;

    beforeEach(() => {
        outputDir = mkdtempSync(join(tmpdir(), "fm123-reporter-"));
    });

    afterEach(() => {
        rmSync(outputDir, {force: true, recursive: true});
    });

    it("writes nothing when every test passed", () => {
        const reporter = new FailureArtifactReporter(outputDir);
        const module = fakeTestModule("a.test.ts", [
            fakeTestCase("a > passes", "passed"),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reporter.onTestRunEnd([module as any]);

        expect(existsSync(outputDir) ? readdirSync(outputDir) : []).toEqual([]);
    });

    it("writes a uniquely-named artifact naming every failed test and its error when a run fails", () => {
        const reporter = new FailureArtifactReporter(outputDir);
        const module = fakeTestModule("SearchWorkspace.test.tsx", [
            fakeTestCase(
                "SearchWorkspace > should close the autocomplete dropdown",
                "failed",
            ),
            fakeTestCase("SearchWorkspace > should render", "passed"),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reporter.onTestRunEnd([module as any]);

        const files = readdirSync(outputDir);
        expect(files).toHaveLength(1);
        expect(files[0]).toMatch(/^vitest-failures-.*\.json$/);
        const contents = JSON.parse(
            readFileSync(join(outputDir, files[0]), "utf-8"),
        ) as {
            failures: Array<{file: string; test: string; errors: unknown[]}>;
        };
        expect(contents.failures).toEqual([
            {
                errors: [
                    {
                        message:
                            "SearchWorkspace > should close the autocomplete dropdown exploded",
                        stack: "at x",
                    },
                ],
                file: "SearchWorkspace.test.tsx",
                test: "SearchWorkspace > should close the autocomplete dropdown",
            },
        ]);
    });

    it("writes an artifact when a run has unhandled errors even with zero failed tests", () => {
        // This is the teardown-race class: the process exits 1, but no test
        // is ever marked "failed" -- `MAINTENANCE.md` names it explicitly.
        // A reporter that only walks `allTests("failed")` produces an empty
        // `failures` array here and silently writes nothing.
        const reporter = new FailureArtifactReporter(outputDir);
        const module = fakeTestModule("DialogProvider.test.tsx", [
            fakeTestCase("DialogProvider > renders", "passed"),
        ]);

        reporter.onTestRunEnd(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [module as any],
            [{message: "window is not defined", stack: "at teardown"}],
        );

        const files = existsSync(outputDir) ? readdirSync(outputDir) : [];
        expect(files).toHaveLength(1);
        const contents = JSON.parse(
            readFileSync(join(outputDir, files[0]), "utf-8"),
        ) as {
            failures: unknown[];
            unhandledErrors: Array<{message: string}>;
        };
        expect(contents.failures).toEqual([]);
        expect(contents.unhandledErrors).toEqual([
            {message: "window is not defined", stack: "at teardown"},
        ]);
    });

    it("preserves a prior failure artifact across a later run that writes its own", () => {
        const reporter = new FailureArtifactReporter(outputDir);
        const failingModule = fakeTestModule("a.test.ts", [
            fakeTestCase("a > fails", "failed"),
        ]);
        const passingModule = fakeTestModule("a.test.ts", [
            fakeTestCase("a > fails", "passed"),
        ]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reporter.onTestRunEnd([failingModule as any]);
        const firstRunFiles = readdirSync(outputDir);
        expect(firstRunFiles).toHaveLength(1);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reporter.onTestRunEnd([passingModule as any]);

        // The green run wrote nothing new, and the red run's artifact is
        // still there naming the failed test -- this is the property that
        // `test-results/vitest-results.json` (overwritten every run) lacks.
        expect(readdirSync(outputDir)).toEqual(firstRunFiles);
        const contents = JSON.parse(
            readFileSync(join(outputDir, firstRunFiles[0]), "utf-8"),
        ) as {failures: Array<{test: string}>};
        expect(contents.failures[0].test).toBe("a > fails");
    });
});
