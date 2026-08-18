import {existsSync} from "node:fs";
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
export const visualApplicability = new Set(["applicable", "not_applicable"]);
export const visualStatuses = new Set(["unassessed", "proposed", "accepted"]);
// Must stay in step with `tests/system/tests/visualEvidence.ts`'s
// `visualViewports`, which is the harness-side registry of the same names.
const visualViewportNames = new Set(["desktop", "mobile", "desktop-wide"]);

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

function taskIds(value) {
    return value === "None" ? [] : value.split(",").map((id) => id.trim());
}

function validateTaskIdList(taskFile, label, value, taskFiles) {
    if (value === null) {
        report(`${taskFile} is missing ${label}`);
        return [];
    }

    if (value === "None") {
        return [];
    }

    const ids = taskIds(value);
    if (ids.length === 0 || ids.some((id) => !/^FM-\d{3}$/.test(id))) {
        report(
            `${taskFile} ${label} must contain only comma-separated FM-NNN IDs or None`,
        );
        return [];
    }

    for (const id of ids) {
        if (!taskFiles.has(id)) {
            report(`${taskFile} ${label} references unknown task ${id}`);
        }
    }
    return ids;
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

function evidencePath(value) {
    return value.split("#", 1)[0];
}

function isContainedProjectPath(recordPath) {
    const resolvedPath = path.resolve(projectRoot, recordPath);
    return (
        !path.isAbsolute(recordPath) &&
        (resolvedPath === projectRoot ||
            resolvedPath.startsWith(`${projectRoot}${path.sep}`)) &&
        existsSync(resolvedPath)
    );
}

function hasValidIsoCalendarDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

function hasHumanAcceptanceMetadata(acceptance) {
    return (
        acceptance &&
        typeof acceptance === "object" &&
        !Array.isArray(acceptance) &&
        typeof acceptance.decision === "string" &&
        acceptance.decision.trim().length > 0 &&
        typeof acceptance.accepted_by === "string" &&
        acceptance.accepted_by.trim().length > 0 &&
        hasValidIsoCalendarDate(acceptance.accepted_on)
    );
}

export function validateVisualRecords(records, reportError = report) {
    for (const record of records) {
        const visual = record.visual;
        if (!visual || typeof visual !== "object" || Array.isArray(visual)) {
            reportError(`FEATURES.yaml ${record.id} requires a visual record`);
            continue;
        }
        if (!visualApplicability.has(visual.applicability)) {
            reportError(
                `FEATURES.yaml ${record.id} visual applicability must be applicable or not_applicable`,
            );
            continue;
        }
        if (!visualStatuses.has(visual.status)) {
            reportError(
                `FEATURES.yaml ${record.id} visual status must be unassessed, proposed, or accepted`,
            );
            continue;
        }
        if (
            visual.applicability === "not_applicable" &&
            visual.status !== "unassessed"
        ) {
            reportError(
                `FEATURES.yaml ${record.id} non-applicable visual records must remain unassessed`,
            );
        }

        if (visual.status === "unassessed") {
            continue;
        }

        const contract = visual.contract;
        if (
            !contract ||
            typeof contract !== "object" ||
            Array.isArray(contract)
        ) {
            reportError(
                `FEATURES.yaml ${record.id} visual ${visual.status} record requires a contract`,
            );
            continue;
        }
        if (!Array.isArray(contract.states) || contract.states.length === 0) {
            reportError(
                `FEATURES.yaml ${record.id} visual contract requires scoped states`,
            );
        }
        if (
            !Array.isArray(contract.viewports) ||
            contract.viewports.length === 0 ||
            contract.viewports.some(
                (viewport) =>
                    !visualViewportNames.has(viewport?.name) ||
                    !Number.isInteger(viewport?.width) ||
                    !Number.isInteger(viewport?.height),
            )
        ) {
            reportError(
                `FEATURES.yaml ${record.id} visual contract requires named integer viewports`,
            );
        }
        if (
            typeof contract.setup !== "string" ||
            contract.setup.trim().length === 0
        ) {
            reportError(
                `FEATURES.yaml ${record.id} visual contract requires deterministic setup`,
            );
        }
        if (
            !Array.isArray(contract.geometry_checks) ||
            contract.geometry_checks.length === 0 ||
            contract.geometry_checks.some(
                (check) =>
                    typeof check !== "string" || check.trim().length === 0,
            )
        ) {
            reportError(
                `FEATURES.yaml ${record.id} visual contract requires geometry checks`,
            );
        }

        for (const field of ["evidence", "snapshots"]) {
            if (visual[field] === undefined) {
                continue;
            }
            if (
                !Array.isArray(visual[field]) ||
                visual[field].some(
                    (entry) =>
                        typeof entry !== "string" ||
                        !isContainedProjectPath(evidencePath(entry)),
                )
            ) {
                reportError(
                    `FEATURES.yaml ${record.id} visual ${field} must contain repository paths`,
                );
            }
        }
        if (!Array.isArray(visual.evidence) || visual.evidence.length === 0) {
            reportError(
                `FEATURES.yaml ${record.id} visual ${visual.status} record requires evidence`,
            );
        }
        if (
            visual.variances !== undefined &&
            (!Array.isArray(visual.variances) ||
                visual.variances.some(
                    (variance) =>
                        !variance ||
                        typeof variance.description !== "string" ||
                        variance.description.trim().length === 0 ||
                        !["proposed", "accepted"].includes(variance.status),
                ))
        ) {
            reportError(
                `FEATURES.yaml ${record.id} visual variances must have description and status`,
            );
        }
        if (visual.status === "accepted") {
            const acceptance = visual.acceptance;
            if (!hasHumanAcceptanceMetadata(acceptance)) {
                reportError(
                    `FEATURES.yaml ${record.id} accepted visual record requires human decision metadata`,
                );
            }
            if (
                visual.variances?.some(
                    (variance) => variance.status !== "accepted",
                )
            ) {
                reportError(
                    `FEATURES.yaml ${record.id} accepted visual record cannot have unaccepted variances`,
                );
            }
        }
        if (
            visual.variances?.some(
                (variance) => variance.status === "accepted",
            ) &&
            (visual.status !== "accepted" ||
                !hasHumanAcceptanceMetadata(visual.acceptance))
        ) {
            reportError(
                `FEATURES.yaml ${record.id} accepted variance requires an accepted visual record with human decision metadata`,
            );
        }
    }
}

async function validateRecordPaths(records, registryName) {
    for (const record of records) {
        for (const field of ["target", "test"]) {
            if (field === "target" && record.backlog) {
                continue;
            }
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

function recordNeedsBacklog(record, tasks) {
    const state = record.parity ?? record.state;
    return (
        ["inventoried", "partial", "planned", "unverified_legacy_api"].includes(
            state,
        ) &&
        (!record.task || tasks.get(record.task)?.status === "done") &&
        !record.backlog
    );
}

function validateBacklog(records, registryName, tasks) {
    for (const record of records) {
        if (recordNeedsBacklog(record, tasks)) {
            report(
                `${registryName} ${record.id} is unfinished without backlog ownership`,
            );
        }
        if (record.backlog?.task && !tasks.has(record.backlog.task)) {
            report(
                `${registryName} ${record.id} backlog references unknown task ${record.backlog.task}`,
            );
        }
        if (record.backlog?.adr && !/^ADR-\d{4}$/.test(record.backlog.adr)) {
            report(
                `${registryName} ${record.id} backlog adr must use ADR-NNNN`,
            );
        }
        if (record.backlog && !record.backlog.rationale) {
            report(`${registryName} ${record.id} backlog requires a rationale`);
        }
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

    for (const [taskId, task] of tasks) {
        const dependsOn = validateTaskIdList(
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
        task.dependsOn = dependsOn;
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
        if (
            !section &&
            [...sections.values()].some((ids) => ids.includes(taskId))
        ) {
            report(`${task.file} is ${task.status} but listed in STATUS.md`);
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
    const tasks = await validateTaskReferences(ids);
    for (const [index, registry] of registries.entries()) {
        for (const record of records[index]) {
            if (record.task !== null && !tasks.has(record.task)) {
                report(
                    `${registry.file} ${record.id} references unknown task ${record.task}`,
                );
            }
        }
        await validateRecordPaths(records[index], registry.file);
    }
    validateVisualRecords(records[0]);
    validateBacklog(records[0], "FEATURES.yaml", tasks);
    validateBacklog(records[1], "COMPONENTS.yaml", tasks);
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
