import react from "@vitejs/plugin-react";
import {configDefaults, defineConfig} from "vitest/config";

import {devBackendPlugin} from "./vite/devBackend";

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
    },
});
