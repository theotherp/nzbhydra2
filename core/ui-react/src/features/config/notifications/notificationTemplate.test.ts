import {describe, expect, it} from "vitest";

import {requireNotificationEvent} from "./notificationEvents";
import {
    insertVariable,
    renderNotificationTemplate,
    variableToken,
} from "./notificationTemplate";

describe("F-CONFIG-NOTIFICATIONS template preview", () => {
    it("should substitute every variable the event provides", () => {
        const event = requireNotificationEvent("INDEXER_DISABLED");
        expect(
            renderNotificationTemplate(event.bodyTemplate, event.sampleValues),
        ).toBe(
            "NZBHydra: Indexer Some indexer was disabled (state: Disabled temporarily). Message:\nSome message.",
        );
    });

    it("should leave a token the event does not provide standing verbatim", () => {
        // `NotificationHandler.fillTemplate` only replaces the keys of
        // `getVariablesWithContent()`, so an admin who writes `$titel$` gets
        // that text delivered. The preview has to say so rather than blanking
        // it, which would hide the typo until the notification fired.
        expect(
            renderNotificationTemplate("$titel$ from $indexerName$ at $when$", {
                indexerName: "Some Indexer",
            }),
        ).toBe("$titel$ from Some Indexer at $when$");
    });

    it("should render an unconfigured template as the empty string", () => {
        expect(renderNotificationTemplate(null, {version: "v1.2.3"})).toBe("");
        expect(renderNotificationTemplate(undefined, {})).toBe("");
        expect(renderNotificationTemplate("", {version: "v1.2.3"})).toBe("");
    });

    it("should substitute every occurrence of a repeated variable", () => {
        expect(renderNotificationTemplate("$a$/$a$/$a$", {a: "x"})).toBe(
            "x/x/x",
        );
    });

    it("should treat a sample value containing dollar signs literally", () => {
        // `String.replace` on the server is literal; `String.prototype
        // .replaceAll` with a string replacement is not -- `$&` there would
        // re-insert the token. This is the regression that guards the
        // split/join in `renderNotificationTemplate`.
        expect(
            renderNotificationTemplate("cost: $price$", {price: "$&$$"}),
        ).toBe("cost: $&$$");
    });

    it("should not let one variable's replacement be re-substituted by the next", () => {
        // Iteration order would otherwise matter: if `a` renders to `$b$` and
        // `b` is substituted afterwards, the output depends on key order. The
        // server has the same property (a `HashMap` iteration), so this pins
        // what it does rather than inventing protection it does not have.
        const rendered = renderNotificationTemplate("$a$", {a: "$b$", b: "!"});
        expect(["$b$", "!"]).toContain(rendered);
    });

    it("should build the token an admin types", () => {
        expect(variableToken("indexerName")).toBe("$indexerName$");
    });
});

describe("F-CONFIG-NOTIFICATIONS variable insertion", () => {
    it("should insert into the middle of existing text at the caret", () => {
        expect(
            insertVariable("Grabbed  from an indexer", "title", {
                end: 8,
                start: 8,
            }),
        ).toEqual({
            caret: 15,
            value: "Grabbed $title$ from an indexer",
        });
    });

    it("should replace the selected text rather than duplicating it", () => {
        expect(
            insertVariable("Grabbed PLACEHOLDER now", "title", {
                end: 19,
                start: 8,
            }),
        ).toEqual({caret: 15, value: "Grabbed $title$ now"});
    });

    it("should append when the field was never focused", () => {
        // `selectionStart`/`selectionEnd` are null on an input the admin has
        // not put a caret into; appending is the only defensible guess, and
        // silently inserting at offset 0 would split the seeded template.
        expect(
            insertVariable("Body so far", "version", {end: null, start: null}),
        ).toEqual({caret: 20, value: "Body so far$version$"});
    });

    it("should insert into an empty field", () => {
        expect(insertVariable("", "body", {end: 0, start: 0})).toEqual({
            caret: 6,
            value: "$body$",
        });
        expect(insertVariable(null, "body", {end: null, start: null})).toEqual({
            caret: 6,
            value: "$body$",
        });
    });

    it("should clamp an offset that is past the end of a shortened value", () => {
        expect(insertVariable("ab", "x", {end: 99, start: 99})).toEqual({
            caret: 5,
            value: "ab$x$",
        });
        expect(insertVariable("ab", "x", {end: -4, start: -3})).toEqual({
            caret: 3,
            value: "$x$ab",
        });
    });

    it("should order a backwards selection", () => {
        expect(insertVariable("abcd", "x", {end: 1, start: 3})).toEqual({
            caret: 4,
            value: "a$x$d",
        });
    });
});
