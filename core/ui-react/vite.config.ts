import react from "@vitejs/plugin-react";
import {configDefaults, defineConfig} from "vitest/config";

export default defineConfig({
    base: process.env.VITE_BASE_PATH ?? "./",
    define: {
        // SockJS still references the Node-style global in its browser bundle.
        global: "globalThis",
    },
    plugins: [react()],
    build: {
        outDir: process.env.VITE_OUT_DIR ?? "dist",
        emptyOutDir: true,
        rollupOptions: {
            output: {
                entryFileNames: "assets/[name].js",
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
