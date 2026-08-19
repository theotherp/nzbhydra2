import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {parse} from "yaml";
import {
    parityStates,
    statusSections,
    validateParity,
} from "./validate-migration.mjs";

function parityErrors(...records) {
    const errors = [];
    validateParity(records, (message) => errors.push(message));
    return errors;
}

test("accepts every parity state the registries actually use", async () => {
    for (const [file, collection] of [
        ["FEATURES.yaml", "features"],
        ["COMPONENTS.yaml", "components"],
    ]) {
        const registry = parse(
            await readFile(`../../docs/frontend-migration/${file}`, "utf8"),
        );
        assert.deepEqual(parityErrors(...registry[collection]), []);
    }
});

test("rejects an unknown parity state", () => {
    assert.match(
        parityErrors({id: "F-TEST", parity: "almost"}).join("\n"),
        /unknown parity\/state/,
    );
});

test("knows the documented parity states", () => {
    assert.ok(parityStates.has("partial"));
    assert.ok(parityStates.has("inventoried"));
    assert.ok(!parityStates.has("accepted"));
});

test("parses STATUS.md sections", () => {
    const sections = statusSections(
        ["## Active", "", "None.", "## Upcoming", "- FM-022: Something"].join(
            "\n",
        ),
    );
    assert.deepEqual(sections.get("Upcoming"), ["FM-022"]);
    assert.deepEqual(sections.get("Active"), []);
});
