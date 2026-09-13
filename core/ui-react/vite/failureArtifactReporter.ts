import {existsSync, mkdirSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";

import type {Reporter, SerializedError, TestModule} from "vitest/node";

/**
 * `vite.config.ts:test.reporters` writes the `json` reporter's summary to a
 * fixed path (`test-results/vitest-results.json`), so the next run --
 * including a reflexive re-run of a flaky failure -- overwrites it. That
 * defect is why three separate task reports lost a failing test's name to a
 * "the next run was green" re-run before anyone could capture it (see
 * `docs/frontend-migration/MAINTENANCE.md`'s "unit suite fails once in every
 * ten to thirteen runs" entry).
 *
 * This reporter is additive: it changes nothing about what a developer sees
 * on the console (the `default` reporter stays first and unchanged), and it
 * does not alter what the `json` reporter writes. It only adds a second,
 * uniquely-named file per run that had at least one failure, so that file
 * survives every subsequent green run instead of being clobbered.
 */
export class FailureArtifactReporter implements Reporter {
    private readonly outputDir: string;

    constructor(outputDir = "test-results") {
        this.outputDir = outputDir;
    }

    onTestRunEnd(
        testModules: ReadonlyArray<TestModule>,
        unhandledErrors: ReadonlyArray<SerializedError> = [],
    ): void {
        const failures: Array<{
            file: string;
            test: string;
            errors: Array<{message: string; stack?: string}>;
        }> = [];
        for (const testModule of testModules) {
            for (const testCase of testModule.children.allTests("failed")) {
                const result = testCase.result();
                const errors: ReadonlyArray<SerializedError> =
                    result.state === "failed" ? result.errors : [];
                failures.push({
                    errors: errors.map((error) => ({
                        message: error.message,
                        stack: error.stack,
                    })),
                    file: testModule.moduleId,
                    test: testCase.fullName,
                });
            }
        }
        // A run that exits 1 with zero failed tests (the teardown-race
        // class documented in `MAINTENANCE.md`) is exactly the case this
        // reporter exists to capture, so `unhandledErrors` alone must still
        // trigger a durable artifact.
        if (failures.length === 0 && unhandledErrors.length === 0) {
            return;
        }
        if (!existsSync(this.outputDir)) {
            mkdirSync(this.outputDir, {recursive: true});
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        // A run-unique filename (timestamp plus a short random suffix to
        // avoid collisions between two runs started within the same
        // millisecond) is what makes this survive a subsequent green run --
        // the fixed-path `json` reporter output cannot.
        const suffix = Math.random().toString(36).slice(2, 8);
        const outputFile = join(
            this.outputDir,
            `vitest-failures-${timestamp}-${suffix}.json`,
        );
        mkdirSync(dirname(outputFile), {recursive: true});
        writeFileSync(
            outputFile,
            JSON.stringify(
                {
                    failures,
                    timestamp,
                    unhandledErrors: unhandledErrors.map((error) => ({
                        message: error.message,
                        stack: error.stack,
                    })),
                },
                null,
                2,
            ),
        );
    }
}
