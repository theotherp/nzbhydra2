import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {parse} from "yaml";
import {statusSections, validateVisualRecords} from "./validate-migration.mjs";

function visualErrors(...records) {
    const errors = [];
    validateVisualRecords(records, (message) => errors.push(message));
    return errors;
}

const unassessed = {
    id: "F-TEST",
    visual: {applicability: "applicable", status: "unassessed"},
};

const acceptedVisual = {
    applicability: "applicable",
    status: "accepted",
    contract: {
        states: ["loaded"],
        viewports: [{name: "desktop", width: 1280, height: 800}],
        setup: "deterministic fixture",
        geometry_checks: ["region has no horizontal overflow"],
    },
    evidence: ["tests/system/tests/visualEvidence.ts"],
    acceptance: {
        decision: "Accepted by a human",
        accepted_by: "Human reviewer",
        accepted_on: "2026-08-15",
    },
};

test("accepts a new applicable feature before a React screen is implemented", () => {
    assert.deepEqual(visualErrors(unassessed), []);
});

test("accepts an unassessed non-applicable feature without implementation evidence", () => {
    assert.deepEqual(
        visualErrors({
            id: "F-TEST-NOT-APPLICABLE",
            visual: {applicability: "not_applicable", status: "unassessed"},
        }),
        [],
    );
});

test("requires every feature inventory record to declare visual applicability", async () => {
    const registry = parse(
        await readFile("../../docs/frontend-migration/FEATURES.yaml", "utf8"),
    );
    assert.deepEqual(visualErrors(...registry.features), []);
});

test("does not require visual evidence from legacy-only, deferred records", () => {
    assert.deepEqual(
        visualErrors({
            ...unassessed,
            parity: "inventoried",
            backlog: {status: "deferred"},
        }),
        [],
    );
});

test("does not reject a pre-existing behavioral record solely for visual evidence", () => {
    assert.deepEqual(
        visualErrors({...unassessed, parity: "partial", task: "FM-001"}),
        [],
    );
});

test("rejects malformed visual records", () => {
    assert.match(
        visualErrors({
            id: "F-TEST",
            visual: {applicability: "applicable", status: "later"},
        }).join("\n"),
        /status must be unassessed, proposed, or accepted/,
    );
});

test("rejects a proposed record without scoped evidence", () => {
    assert.match(
        visualErrors({
            id: "F-TEST",
            visual: {applicability: "applicable", status: "proposed"},
        }).join("\n"),
        /requires a contract/,
    );
});

test("rejects accepted records without human decision metadata", () => {
    assert.match(
        visualErrors({
            id: "F-TEST",
            visual: {
                applicability: "applicable",
                status: "accepted",
                contract: {
                    states: ["loaded"],
                    viewports: [{name: "desktop", width: 1280, height: 800}],
                    setup: "deterministic fixture",
                    geometry_checks: ["region has no horizontal overflow"],
                },
                evidence: ["tests/system/tests/visualEvidence.ts"],
            },
        }).join("\n"),
        /requires human decision metadata/,
    );
});

test("rejects an accepted variance when its visual record is not human accepted", () => {
    assert.match(
        visualErrors({
            id: "F-TEST",
            visual: {
                ...acceptedVisual,
                status: "proposed",
                variances: [
                    {
                        description: "Intentional spacing difference",
                        status: "accepted",
                    },
                ],
            },
        }).join("\n"),
        /accepted variance requires an accepted visual record with human decision metadata/,
    );
});

test("rejects accepted records with a non-calendar acceptance date", () => {
    assert.match(
        visualErrors({
            id: "F-TEST",
            visual: {
                ...acceptedVisual,
                acceptance: {
                    ...acceptedVisual.acceptance,
                    accepted_on: "2026-02-30",
                },
            },
        }).join("\n"),
        /requires human decision metadata/,
    );
});

test("rejects evidence paths outside the repository", () => {
    assert.match(
        visualErrors({
            id: "F-TEST",
            visual: {
                applicability: "applicable",
                status: "proposed",
                contract: {
                    states: ["loaded"],
                    viewports: [{name: "desktop", width: 1280, height: 800}],
                    setup: "deterministic fixture",
                    geometry_checks: ["region has no horizontal overflow"],
                },
                evidence: ["/tmp/visual-evidence.png"],
            },
        }).join("\n"),
        /must contain repository paths/,
    );
});

test("counts only the leading task ID in a STATUS task-list bullet", () => {
    const sections = statusSections(`## Blocked

- FM-027: Search Workspace And History Visual Parity — blocked by FM-026.
`);

    assert.deepEqual(sections.get("Blocked"), ["FM-027"]);
    assert.ok(!sections.get("Blocked").includes("FM-026"));
});
