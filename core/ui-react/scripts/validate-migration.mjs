import {access, readdir, readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

import {parse} from "yaml";

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);
const migrationDirectory = path.join(projectRoot, "docs", "frontend-migration");
const registries = [
    {file: "FEATURES.yaml", collection: "features"},
    {file: "COMPONENTS.yaml", collection: "components"},
    {file: "APIS.yaml", collection: "apis"},
];

const errors = [];
const taskStatuses = new Set([
    "planned",
    "ready",
    "in_progress",
    "review",
    "blocked",
    "done",
]);
export const parityStates = new Set([
    "inventoried",
    "planned",
    "partial",
    "done",
    "unverified_legacy_api",
]);

function report(message) {
    errors.push(message);
}

function addUniqueIds(records, registryName, ids) {
    for (const record of records) {
        if (typeof record?.id !== "string" || record.id.length === 0) {
            report(`${registryName} contains a record without an ID`);
            continue;
        }

        if (ids.has(record.id)) {
            report(`${registryName} contains duplicate ID ${record.id}`);
            continue;
        }

        ids.add(record.id);
    }
}

async function readRegistry({file, collection}) {
    const registryPath = path.join(migrationDirectory, file);
    let registry;

    try {
        registry = parse(await readFile(registryPath, "utf8"));
    } catch (error) {
        report(`Unable to parse ${file}: ${error.message}`);
        return [];
    }

    if (!Array.isArray(registry?.[collection])) {
        report(`${file} must contain a ${collection} list`);
        return [];
    }

    return registry[collection];
}

function validateActiveApiPaths(records) {
    const methodsAndPaths = new Set();

    for (const record of records) {
        if (
            typeof record?.method !== "string" ||
            typeof record?.path !== "string"
        ) {
            continue;
        }

        const key = `${record.method} ${record.path}`;
        if (methodsAndPaths.has(key)) {
            report(
                `APIS.yaml contains duplicate active API method/path ${key}`,
            );
        }
        methodsAndPaths.add(key);
    }
}

function referencedIds(contents, label, prefix) {
    const match = contents.match(
        new RegExp(
            `${label}:\\s*(.*?)(?=\\s+(?:Feature IDs|Component IDs|API IDs|Depends on|Blocks):|$)`,
            "m",
        ),
    );

    return match?.[1].match(new RegExp(`${prefix}-[A-Z0-9-]+`, "g")) ?? [];
}

function taskField(contents, label, nextLabel) {
    const match = contents.match(
        new RegExp(`${label}:\\s*(.*?)(?=\\s+${nextLabel}:|$)`, "m"),
    );
    return match?.[1].trim() ?? null;
}

function validateTaskIdList(taskFile, label, value, taskFiles) {
    if (value === null) {
        report(`${taskFile} is missing ${label}`);
        return;
    }

    if (value === "None") {
        return;
    }

    const ids = value.split(",").map((id) => id.trim());
    if (ids.length === 0 || ids.some((id) => !/^FM-\d{3}$/.test(id))) {
        report(
            `${taskFile} ${label} must contain only comma-separated FM-NNN IDs or None`,
        );
        return;
    }

    for (const id of ids) {
        if (!taskFiles.has(id)) {
            report(`${taskFile} ${label} references unknown task ${id}`);
        }
    }
}

export function statusSections(contents) {
    const sections = new Map();
    let section = null;
    for (const line of contents.split("\n")) {
        const heading = line.match(
            /^## (Active|Review|Blocked|Upcoming)$/,
        )?.[1];
        if (heading) {
            section = heading;
            sections.set(section, []);
            continue;
        }
        if (section) {
            const taskId = line.match(/^- (FM-\d{3}):/)?.[1];
            if (taskId) {
                sections.get(section).push(taskId);
            }
        }
    }
    return sections;
}

function pathsFor(value) {
    if (typeof value === "string") {
        return value
            .split(";")
            .map((path) => path.trim())
            .filter(Boolean);
    }
    if (Array.isArray(value)) {
        return value.flatMap(pathsFor);
    }
    return [];
}

async function validateRecordPaths(records, registryName) {
    for (const record of records) {
        for (const field of ["target", "test", "tests"]) {
            for (const recordPath of pathsFor(record[field])) {
                const resolvedPath = path.resolve(projectRoot, recordPath);
                if (
                    path.isAbsolute(recordPath) ||
                    (resolvedPath !== projectRoot &&
                        !resolvedPath.startsWith(`${projectRoot}${path.sep}`))
                ) {
                    report(
                        `${registryName} ${record.id} ${field} must be contained in the project: ${recordPath}`,
                    );
                    continue;
                }
                // `target` may name a future location for a record whose
                // implementation does not exist yet; tests must exist.
                if (field === "target") {
                    continue;
                }
                try {
                    await access(resolvedPath);
                } catch {
                    report(
                        `${registryName} ${record.id} ${field} path does not exist: ${recordPath}`,
                    );
                }
            }
        }
    }
}

export function validateParity(records, reportError = report) {
    for (const record of records) {
        const state = record.parity ?? record.state;
        if (!parityStates.has(state)) {
            reportError(
                `FEATURES.yaml/COMPONENTS.yaml ${record.id} has unknown parity/state ${state}`,
            );
        }
    }
}

// Playwright clears its output directory at the start of every run, so
// durable visual evidence written by tests/system/tests/visualEvidence.ts
// must live outside it (see the 2026-08-16 evidence-cleanup-hazard fix,
// commit 5c36a7a14). Both paths resolve against tests/system: the helper
// writes relative to the Playwright cwd, and `outputDir` resolves against
// the config file's directory.
export function validateVisualEvidenceContainment(
    helperSource,
    playwrightConfigSource,
    reportError = report,
) {
    const rootMatch = helperSource.match(
        /^export const visualEvidenceRoot = "([^"]+)";$/m,
    );
    if (!rootMatch) {
        reportError(
            "tests/system/tests/visualEvidence.ts must export a string literal visualEvidenceRoot so validate:migration can check it stays outside Playwright's cleared output directory",
        );
        return;
    }
    const outputDir =
        playwrightConfigSource.match(/\boutputDir\s*:\s*"([^"]+)"/)?.[1] ??
        "test-results";
    const systemDirectory = path.join(projectRoot, "tests", "system");
    const evidenceRoot = path.resolve(systemDirectory, rootMatch[1]);
    const clearedRoot = path.resolve(systemDirectory, outputDir);
    const relative = path.relative(clearedRoot, evidenceRoot);
    if (
        relative === "" ||
        (!relative.startsWith(`..${path.sep}`) &&
            relative !== ".." &&
            !path.isAbsolute(relative))
    ) {
        reportError(
            `visual evidence root ${rootMatch[1]} is inside Playwright's cleared output directory ${outputDir}; a run of any spec would delete every other feature's evidence`,
        );
    }
}

function validateAdoptedApiEvidence(records) {
    for (const record of records) {
        if (
            !["generated_weak_validated", "generated_typed"].includes(
                record.contract_state,
            )
        ) {
            continue;
        }
        if (pathsFor(record.target).length === 0) {
            report(`${record.id} is adopted but has no target evidence`);
        }
        if (pathsFor(record.test).length === 0) {
            report(`${record.id} is adopted but has no test evidence`);
        }
    }
}

async function validateTaskReferences(ids) {
    const tasksDirectory = path.join(migrationDirectory, "tasks");
    const taskFiles = (await readdir(tasksDirectory)).filter((file) =>
        /^FM-\d+.*\.md$/.test(file),
    );

    const tasks = new Map();
    for (const taskFile of taskFiles) {
        const contents = await readFile(
            path.join(tasksDirectory, taskFile),
            "utf8",
        );
        const taskId = taskFile.match(/^(FM-\d{3})/)?.[1];
        const status = taskField(contents, "Status", "Owner");
        if (!taskId || !taskStatuses.has(status)) {
            report(`${taskFile} has an invalid Status`);
        } else {
            tasks.set(taskId, {file: taskFile, status, contents});
        }
        for (const [label, prefix, validIds] of [
            ["Feature IDs", "F", ids.features],
            ["Component IDs", "C", ids.components],
            ["API IDs", "API", ids.apis],
        ]) {
            for (const id of referencedIds(contents, label, prefix)) {
                if (!validIds.has(id)) {
                    report(
                        `${taskFile} references unknown ${label.slice(0, -1).toLowerCase()} ${id}`,
                    );
                }
            }
        }
    }

    for (const task of tasks.values()) {
        validateTaskIdList(
            task.file,
            "Depends on",
            taskField(task.contents, "Depends on", "Blocks"),
            tasks,
        );
        validateTaskIdList(
            task.file,
            "Blocks",
            taskField(task.contents, "Blocks", "Decision Dependencies"),
            tasks,
        );
    }
    return tasks;
}

async function validateStatus(tasks) {
    const contents = await readFile(
        path.join(migrationDirectory, "STATUS.md"),
        "utf8",
    );
    const sections = statusSections(contents);
    const expectedSection = {
        in_progress: "Active",
        review: "Review",
        blocked: "Blocked",
        ready: "Upcoming",
    };
    for (const [taskId, task] of tasks) {
        const section = expectedSection[task.status];
        if (section && !sections.get(section)?.includes(taskId)) {
            report(
                `${task.file} is ${task.status} but absent from STATUS.md ${section}`,
            );
        }
        if (
            section &&
            [...sections.entries()].some(
                ([sectionName, ids]) =>
                    sectionName !== section && ids.includes(taskId),
            )
        ) {
            report(
                `${task.file} is ${task.status} but listed in an incompatible STATUS.md section`,
            );
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const records = await Promise.all(registries.map(readRegistry));
    const ids = {
        features: new Set(),
        components: new Set(),
        apis: new Set(),
    };

    for (const [index, registry] of registries.entries()) {
        addUniqueIds(records[index], registry.file, ids[registry.collection]);
    }

    validateActiveApiPaths(records[2]);
    validateAdoptedApiEvidence(records[2]);
    validateVisualEvidenceContainment(
        await readFile(
            path.join(
                projectRoot,
                "tests",
                "system",
                "tests",
                "visualEvidence.ts",
            ),
            "utf8",
        ),
        await readFile(
            path.join(projectRoot, "tests", "system", "playwright.config.ts"),
            "utf8",
        ),
    );
    validateParity(records[0]);
    validateParity(records[1]);
    const tasks = await validateTaskReferences(ids);
    for (const [index, registry] of registries.entries()) {
        await validateRecordPaths(records[index], registry.file);
    }
    await validateStatus(tasks);

    if (errors.length > 0) {
        console.error("Migration registry validation failed:");
        for (const error of errors) {
            console.error(`- ${error}`);
        }
        process.exitCode = 1;
    } else {
        console.log("Migration registries and task metadata are valid.");
    }
}
