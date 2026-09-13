import {execFile} from "node:child_process";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {promisify} from "node:util";

const execFileAsync = promisify(execFile);
const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "nzbhydra-openapi-"),
);
const generatedPath = path.join(temporaryDirectory, "openapi.ts");
const committedPath = "src/api/generated/openapi.ts";
const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

try {
    await execFileAsync(npmExecutable, [
        "exec",
        "--",
        "openapi-typescript",
        "../openapi.json",
        "-o",
        generatedPath,
    ]);
    await execFileAsync(npmExecutable, [
        "exec",
        "--",
        "prettier",
        "--config",
        ".prettierrc.json",
        "--write",
        generatedPath,
    ]);

    const [generated, committed] = await Promise.all([
        readFile(generatedPath),
        readFile(committedPath),
    ]);
    if (!generated.equals(committed)) {
        throw new Error(
            "Generated OpenAPI types are stale; run npm run generate:api and commit the result.",
        );
    }

    console.log("Generated OpenAPI types are current.");
} finally {
    await rm(temporaryDirectory, {force: true, recursive: true});
}
