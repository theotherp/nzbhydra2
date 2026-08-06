import {readdir, readFile} from "node:fs/promises";
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

async function validateTaskReferences(ids) {
    const tasksDirectory = path.join(migrationDirectory, "tasks");
    const taskFiles = (await readdir(tasksDirectory)).filter((file) =>
        /^FM-\d+.*\.md$/.test(file),
    );

    for (const taskFile of taskFiles) {
        const contents = await readFile(
            path.join(tasksDirectory, taskFile),
            "utf8",
        );
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
}

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
await validateTaskReferences(ids);

if (errors.length > 0) {
    console.error("Migration registry validation failed:");
    for (const error of errors) {
        console.error(`- ${error}`);
    }
    process.exitCode = 1;
} else {
    console.log("Migration registries and task metadata are valid.");
}
