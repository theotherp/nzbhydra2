import {readdirSync, readFileSync} from "node:fs";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {describe, expect, it} from "vitest";

import {
    newNotificationEntry,
    notificationEvent,
    NOTIFICATION_EVENTS,
    requireNotificationEvent,
    UnknownNotificationEventError,
} from "./notificationEvents";

/**
 * The backend enum is read from source rather than restated here: restating it
 * would prove only that this file agrees with itself. `NotificationEventType`
 * is the vocabulary the "Add new notification" menu offers and the value
 * `API-NOTIFICATIONS-TEST` takes in its path, so a constant added on the Java
 * side must fail this suite instead of silently disappearing from the UI.
 */
const REPOSITORY_ROOT = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../..",
);

const NOTIFICATION_EVENT_TYPE_JAVA = join(
    REPOSITORY_ROOT,
    "shared/mapping/src/main/java/org/nzbhydra/config/notification/NotificationEventType.java",
);

/**
 * Every implementation of `NotificationEvent` lives in this one package, and
 * the directory is read rather than a file list being restated: the class whose
 * variables would silently go unchecked is precisely the one someone forgot to
 * add to a list. Note that `ExternalToolConfigResultEvent` does *not* follow
 * the `*NotificationEvent.java` naming, so globbing on that suffix would miss
 * it -- the filter below is "implements NotificationEvent", not the file name.
 */
const NOTIFICATIONS_JAVA_DIR = join(
    REPOSITORY_ROOT,
    "core/src/main/java/org/nzbhydra/notifications",
);

const INDEXER_CONFIG_JAVA = join(
    REPOSITORY_ROOT,
    "shared/mapping/src/main/java/org/nzbhydra/config/indexer/IndexerConfig.java",
);

function backendEventTypes(): string[] {
    const source = readFileSync(NOTIFICATION_EVENT_TYPE_JAVA, "utf8")
        .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
        .replaceAll(/\/\/[^\n]*/g, " ");
    const body = source.match(
        /enum\s+NotificationEventType\s*\{([\s\S]*?)\}/,
    )?.[1];
    if (body === undefined) {
        throw new Error(
            `Unable to locate the NotificationEventType enum body in ${NOTIFICATION_EVENT_TYPE_JAVA}`,
        );
    }
    // Constants only: the enum has no bodies or fields today, and a constant
    // with arguments (`FOO(1)`) would still yield its name.
    return body
        .split(";")[0]
        .split(",")
        .map((constant) => constant.trim().match(/^[A-Z][A-Z0-9_]*/)?.[0])
        .filter((constant): constant is string => constant !== undefined);
}

function withoutComments(source: string): string {
    return source
        .replaceAll(/\/\*[\s\S]*?\*\//g, " ")
        .replaceAll(/\/\/[^\n]*/g, " ");
}

/**
 * The text between `source[open]`'s `(` and its matching `)`, counting nesting
 * and skipping string literals. A lazy `[\s\S]*?\)` cannot do this: the first
 * `)` of `put(STATE, state.humanize())` closes `humanize`, not `put`, and the
 * argument that would be dropped is exactly the interesting one.
 */
function balancedArguments(source: string, open: number): string {
    let depth = 0;
    let inString = false;
    for (let cursor = open; cursor < source.length; cursor += 1) {
        const character = source[cursor];
        if (inString) {
            if (character === "\\") {
                cursor += 1;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }
        if (character === '"') {
            inString = true;
        } else if (character === "(") {
            depth += 1;
        } else if (character === ")") {
            depth -= 1;
            if (depth === 0) {
                return source.slice(open + 1, cursor);
            }
        }
    }
    throw new Error(`Unbalanced argument list at offset ${open}`);
}

/** An argument list split on its *top-level* commas. */
function splitArguments(argumentList: string): string[] {
    const args: string[] = [];
    let depth = 0;
    let inString = false;
    let current = "";
    for (let cursor = 0; cursor < argumentList.length; cursor += 1) {
        const character = argumentList[cursor];
        current += character;
        if (inString) {
            if (character === "\\") {
                current += argumentList[cursor + 1] ?? "";
                cursor += 1;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }
        if (character === '"') {
            inString = true;
        } else if (character === "(") {
            depth += 1;
        } else if (character === ")") {
            depth -= 1;
        } else if (character === "," && depth === 0) {
            args.push(current.slice(0, -1).trim());
            current = "";
        }
    }
    if (current.trim() !== "") {
        args.push(current.trim());
    }
    return args;
}

type BackendEventClass = {
    className: string;
    eventType: string;
    /** Variable name -> the `getTestInstance()` argument expression behind it. */
    sampleExpressions: Map<string, string>;
};

/**
 * One event class, read the way the editor's chips and preview read it: the
 * variable *names* come from `getVariablesWithContent()`'s constants, and the
 * value behind each name is traced through the field it reads to the argument
 * `getTestInstance()` passes for that field.
 */
function parseBackendEventClass(
    className: string,
    rawSource: string,
): BackendEventClass {
    const source = withoutComments(rawSource);

    const constants = new Map<string, string>();
    for (const match of source.matchAll(
        /private\s+static\s+final\s+String\s+([A-Z_][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*;/g,
    )) {
        constants.set(match[1], match[2]);
    }

    // Instance fields in declaration order -- which is the order Lombok's
    // `@AllArgsConstructor` takes them in, and therefore the order
    // `getTestInstance()`'s arguments are in.
    const fields = [
        ...source.matchAll(/private\s+(?!static\b)[\w.]+\s+(\w+)\s*;/g),
    ].map((match) => match[1]);

    const eventType = source.match(
        /getEventType\(\)[\s\S]*?return\s+NotificationEventType\.(\w+)\s*;/,
    )?.[1];
    if (eventType === undefined) {
        throw new Error(`No NotificationEventType returned by ${className}`);
    }

    const testInstanceIndex = source.indexOf("getTestInstance()");
    const constructorIndex = source.indexOf(
        `new ${className}(`,
        testInstanceIndex,
    );
    if (testInstanceIndex < 0 || constructorIndex < 0) {
        throw new Error(
            `No getTestInstance() constructor call in ${className}`,
        );
    }
    const testArguments = splitArguments(
        balancedArguments(source, constructorIndex + `new ${className}`.length),
    );

    const sampleExpressions = new Map<string, string>();
    const put = "variablesWithContent.put";
    for (
        let index = source.indexOf(put);
        index >= 0;
        index = source.indexOf(put, index + 1)
    ) {
        const [constantName, expression] = splitArguments(
            balancedArguments(source, index + put.length),
        );
        const variable = constants.get(constantName.trim());
        if (variable === undefined) {
            throw new Error(
                `${className} puts an unresolved constant ${constantName}`,
            );
        }
        // The field the substituted value is read from: the first identifier of
        // the expression, so `state.humanize()` and the `disabledAt == null ? …`
        // ternary both resolve to their field.
        const field = expression.trim().match(/^[A-Za-z_]\w*/)?.[0];
        const fieldIndex = field === undefined ? -1 : fields.indexOf(field);
        if (fieldIndex < 0) {
            throw new Error(
                `${className}.${variable} reads "${expression.trim()}", which is not one of its fields (${fields.join(", ")})`,
            );
        }
        sampleExpressions.set(variable, testArguments[fieldIndex].trim());
    }

    return {className, eventType, sampleExpressions};
}

function backendEventClasses(): BackendEventClass[] {
    return readdirSync(NOTIFICATIONS_JAVA_DIR)
        .filter((name) => name.endsWith(".java"))
        .map((name) => ({
            className: name.replace(/\.java$/, ""),
            source: readFileSync(join(NOTIFICATIONS_JAVA_DIR, name), "utf8"),
        }))
        .filter(({source}) =>
            /class\s+\w+\s+implements\s+NotificationEvent\b/.test(
                withoutComments(source),
            ),
        )
        .map(({className, source}) =>
            parseBackendEventClass(className, source),
        );
}

/** `IndexerConfig.State.<constant>.humanize()`, read from the enum's switch. */
function humanizedIndexerState(constant: string): string {
    const humanized = withoutComments(
        readFileSync(INDEXER_CONFIG_JAVA, "utf8"),
    ).match(new RegExp(`case\\s+${constant}\\s*->\\s*"([^"]*)"`))?.[1];
    if (humanized === undefined) {
        throw new Error(
            `No humanize() arm for IndexerConfig.State.${constant}`,
        );
    }
    return humanized;
}

/**
 * The `getTestInstance()` arguments that are not string literals, and what the
 * client is expected to show for each. Keeping this an exhaustive, asserted set
 * is the point: a new non-literal fixture on the Java side fails the suite here
 * rather than being waved through as "not comparable".
 */
const NON_LITERAL_SAMPLES: Readonly<
    Record<string, {check: (sample: string) => void; expression: string}>
> = {
    "INDEXER_DISABLED.state": {
        expression: "IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY",
        check: (sample) =>
            expect(sample).toBe(
                humanizedIndexerState("DISABLED_SYSTEM_TEMPORARY"),
            ),
    },
    "INDEXER_REENABLED.disabledAt": {
        expression: "Instant.now()",
        // `Instant.now().toString()` is whatever moment the send happened, so
        // the shape is what can be asserted -- and it is what matters: a sample
        // that stopped looking like an instant would mislead.
        check: (sample) => {
            expect(sample).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
            expect(Number.isNaN(Date.parse(sample))).toBe(false);
        },
    },
};

describe("F-CONFIG-NOTIFICATIONS backend variable drift", () => {
    it("should find one event class per backend event type", () => {
        // Guards every assertion below: an empty or partial parse would make
        // them vacuous, and the class that goes missing is the one nobody
        // remembered to name.
        const classes = backendEventClasses();
        expect(classes.length).toBeGreaterThanOrEqual(8);
        expect(classes.map((parsed) => parsed.eventType).sort()).toEqual(
            [...backendEventTypes()].sort(),
        );
        for (const parsed of classes) {
            expect(
                parsed.sampleExpressions.size,
                parsed.className,
            ).toBeGreaterThan(0);
        }
    });

    it("should declare exactly the variables each backend event substitutes", () => {
        for (const parsed of backendEventClasses()) {
            const event = requireNotificationEvent(parsed.eventType);
            const expected = [...parsed.sampleExpressions.keys()].sort();
            expect([...event.variables].sort(), parsed.className).toEqual(
                expected,
            );
            expect(
                Object.keys(event.sampleValues).sort(),
                parsed.className,
            ).toEqual(expected);
        }
    });

    it("should show the sample values the backend's own test instance carries", () => {
        const nonLiteral: string[] = [];
        for (const parsed of backendEventClasses()) {
            const event = requireNotificationEvent(parsed.eventType);
            for (const [variable, expression] of parsed.sampleExpressions) {
                const key = `${parsed.eventType}.${variable}`;
                const literal = expression.match(/^"([^"]*)"$/)?.[1];
                if (literal !== null && literal !== undefined) {
                    expect(event.sampleValues[variable], key).toBe(literal);
                    continue;
                }
                nonLiteral.push(key);
                const expected = NON_LITERAL_SAMPLES[key];
                expect(
                    expected,
                    `${key} is a new non-literal fixture`,
                ).toBeDefined();
                expect(expression, key).toBe(expected.expression);
                expected.check(event.sampleValues[variable]);
            }
        }
        expect(nonLiteral.sort()).toEqual(
            Object.keys(NON_LITERAL_SAMPLES).sort(),
        );
    });

    it("should not take its variable names from the legacy help prose", () => {
        // `RESULT_DOWNLOAD`'s help says "$title" with no closing `$`, kept
        // deliberately. Anything that scraped `$(\w+)\$` out of it would lose
        // `title` -- the variable its own body template uses.
        const event = requireNotificationEvent("RESULT_DOWNLOAD");
        expect(event.templateHelp).toContain("$title,");
        expect(event.variables).toContain("title");
    });
});

describe("F-CONFIG-NOTIFICATIONS event table", () => {
    it("should parse the backend enum it is validated against", () => {
        // Guards the assertions below: a parse that silently produced an empty
        // list would make every comparison vacuously true.
        expect(backendEventTypes().length).toBeGreaterThanOrEqual(8);
    });

    it("should cover exactly the backend NotificationEventType constants", () => {
        expect(
            [...NOTIFICATION_EVENTS.map((event) => event.eventType)].sort(),
        ).toEqual([...backendEventTypes()].sort());
    });

    it("should offer the event types in legacy's declaration order", () => {
        expect(NOTIFICATION_EVENTS.map((event) => event.eventType)).toEqual([
            "AUTH_FAILURE",
            "RESULT_DOWNLOAD",
            "RESULT_DOWNLOAD_COMPLETION",
            "INDEXER_DISABLED",
            "INDEXER_REENABLED",
            "UPDATE_INSTALLED",
            "VIP_RENEWAL_REQUIRED",
            "EXTERNAL_TOOL_CONFIGURATION",
        ]);
    });

    it("should give every event its own label, templates, help, and message type", () => {
        for (const eventType of backendEventTypes()) {
            const event = requireNotificationEvent(eventType);
            expect(event.label.length, eventType).toBeGreaterThan(0);
            expect(event.titleTemplate.length, eventType).toBeGreaterThan(0);
            expect(event.bodyTemplate.length, eventType).toBeGreaterThan(0);
            expect(event.templateHelp.length, eventType).toBeGreaterThan(0);
            expect(
                ["INFO", "SUCCESS", "WARNING", "FAILURE"],
                eventType,
            ).toContain(event.messageType);
        }
    });

    it("should not share a body template or help text between two events", () => {
        // The trap this table exists for: seeding a new entry from one generic
        // default rather than from the event's own templates.
        const bodies = NOTIFICATION_EVENTS.map((event) => event.bodyTemplate);
        const helps = NOTIFICATION_EVENTS.map((event) => event.templateHelp);
        expect(new Set(bodies).size).toBe(bodies.length);
        expect(new Set(helps).size).toBe(helps.length);
    });

    it("should carry legacy's exact strings for a sampled event", () => {
        expect(requireNotificationEvent("INDEXER_DISABLED")).toEqual({
            eventType: "INDEXER_DISABLED",
            label: "Indexer disabled",
            titleTemplate: "Indexer disabled",
            bodyTemplate:
                "NZBHydra: Indexer $indexerName$ was disabled (state: $state$). Message:\n$message$.",
            templateHelp:
                "Available variables: $indexerName$, $state$, $message$.",
            messageType: "WARNING",
            variables: ["indexerName", "state", "message"],
            sampleValues: {
                indexerName: "Some indexer",
                message: "Some message",
                state: "Disabled temporarily",
            },
        });
    });
});

describe("F-CONFIG-NOTIFICATIONS unknown event types", () => {
    it("should report an unknown event type rather than returning a definition", () => {
        expect(notificationEvent("NOT_AN_EVENT")).toBeUndefined();
        expect(notificationEvent(null)).toBeUndefined();
        expect(notificationEvent(42)).toBeUndefined();
    });

    it("should fail loudly when an entry would be seeded from an unknown event", () => {
        expect(() => requireNotificationEvent("NOT_AN_EVENT")).toThrow(
            UnknownNotificationEventError,
        );
        expect(() => newNotificationEntry("NOT_AN_EVENT")).toThrow(
            /Unknown notification event type: NOT_AN_EVENT/,
        );
    });
});

describe("F-CONFIG-NOTIFICATIONS entry seeding", () => {
    it("should seed a new entry from its own event's defaults, for every backend event type", () => {
        for (const eventType of backendEventTypes()) {
            const event = requireNotificationEvent(eventType);
            expect(newNotificationEntry(eventType), eventType).toEqual({
                eventType,
                appriseUrls: null,
                titleTemplate: event.titleTemplate,
                bodyTemplate: event.bodyTemplate,
                messageType: event.messageType,
            });
        }
    });

    it("should never fall back to legacy's WARNING defaultModel message type", () => {
        // `formly-config.js` copies `defaultModel` (messageType 'WARNING') and
        // then overwrites it with the event's own type; an entry that kept
        // WARNING for, say, RESULT_DOWNLOAD would mean the overwrite was lost.
        expect(newNotificationEntry("RESULT_DOWNLOAD").messageType).toBe(
            "INFO",
        );
        expect(newNotificationEntry("AUTH_FAILURE").messageType).toBe(
            "FAILURE",
        );
        expect(newNotificationEntry("INDEXER_REENABLED").messageType).toBe(
            "SUCCESS",
        );
    });

    it("should produce an independent object per entry", () => {
        const first = newNotificationEntry("AUTH_FAILURE");
        const second = newNotificationEntry("AUTH_FAILURE");
        first.appriseUrls = "json://localhost";
        expect(second.appriseUrls).toBeNull();
    });
});
