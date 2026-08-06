import react from "@vitejs/plugin-react";
import {defineConfig} from "vitest/config";

export default defineConfig({
    base: process.env.VITE_BASE_PATH ?? "/static/react/",
    plugins: [react()],
    build: {
        outDir: "dist",
    },
    test: {
        environment: "jsdom",
        setupFiles: "./vitest.setup.ts",
    },
});
