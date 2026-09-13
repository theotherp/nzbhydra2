import react from "@vitejs/plugin-react";
import {configDefaults, defineConfig} from "vitest/config";

import {devBackendPlugin} from "./vite/devBackend";
import {FailureArtifactReporter} from "./vite/failureArtifactReporter";

export default defineConfig({
    base: process.env.VITE_BASE_PATH ?? "./",
    define: {
        // SockJS still references the Node-style global in its browser bundle.
        global: "globalThis",
    },
    plugins: [react(), devBackendPlugin()],
    build: {
        outDir: process.env.VITE_OUT_DIR ?? "dist",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: "assets/[name].js",
                // ADR-0010 (Option A, accepted): pin the entry stylesheet to
                // `assets/index.css` -- unhashed -- so the hand-maintained
                // Thymeleaf shell `core/src/main/resources/templates/react.html`
                // can `<link>` it, mirroring the deliberate `entryFileNames`
                // pin above. Only the entry CSS is special-cased: every other
                // emitted asset (the `@fontsource` font files, any future
                // route-level code-split chunk) keeps Vite's default
                // content-hashed name, which is also what keeps a split chunk
                // from colliding with this pinned name.
                assetFileNames: (asset) =>
                    asset.names.includes("index.css")
                        ? "assets/index.css"
                        : "assets/[name]-[hash][extname]",
            },
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: "./vitest.setup.ts",
        exclude: [
            ...configDefaults.exclude,
            "scripts/validate-migration.test.mjs",
        ],
        // `default` first, unchanged: every agent and every gate chain reads
        // the console output, so it must keep its current shape. The `json`
        // reporter is additive and writes to a file because this suite fails
        // intermittently -- roughly once in ten to thirteen full runs -- and
        // three separate tasks lost the failing test's name to a truncated
        // pipe before it could be investigated. A file survives scrollback.
        //
        // Both `json`'s `outputFile` and this instance of the custom
        // `FailureArtifactReporter` share the fixed-path problem's fix and
        // its non-fix: `json` still overwrites `test-results/vitest-results.json`
        // every run (unchanged shape -- gate chains that parse it are not
        // touched), but `FailureArtifactReporter` additionally writes a
        // uniquely-named `test-results/vitest-failures-<timestamp>-<suffix>.json`
        // whenever a run has at least one failure, and never deletes an
        // older one -- so a reflexive green re-run can no longer destroy the
        // evidence of the run before it (FM-123).
        reporters: ["default", "json", "junit", new FailureArtifactReporter()],
        outputFile: {
            // Git-ignored via `.gitignore`, mirroring how `tests/system`'s
            // Playwright `test-results/` output is ignored rather than
            // committed.
            json: "test-results/vitest-results.json",
            // Consumed in CI by junit-to-ctrf to feed the ctrf-io/github-test-reporter
            // insights/flaky-rate/slowest/fail-rate report (see frontend-ci.yml).
            junit: "test-results/vitest-junit.xml",
        },
    },
});
