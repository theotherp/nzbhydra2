import {readFileSync} from "node:fs";
import {dirname, resolve} from "node:path";
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
const NOTIFICATION_EVENT_TYPE_JAVA = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../../shared/mapping/src/main/java/org/nzbhydra/config/notification/NotificationEventType.java",
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
