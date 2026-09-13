/**
 * `F-CONFIG-NOTIFICATIONS`: the two pure operations the template editor is
 * built from -- rendering a preview and inserting a variable at the caret.
 *
 * Both live here rather than inside a component because both are exactly the
 * kind of thing a rendered accordion cannot be trusted to prove: the
 * substitution has to mirror `NotificationHandler.fillTemplate` (including what
 * it deliberately does *not* do), and the insertion has to be correct in the
 * middle of existing text, not just into an empty field.
 */

/** The token an admin writes, and `fillTemplate` replaces: `$indexerName$`. */
export function variableToken(name: string): string {
    return `$${name}$`;
}

/**
 * The template with every *known* variable replaced by its sample value, the
 * way the server renders a real notification
 * (`NotificationHandler.fillTemplate`: one `String.replace` per entry of
 * `getVariablesWithContent()`).
 *
 * Two consequences of mirroring that loop rather than inventing a nicer one:
 *
 * - a `$token$` the event does not provide is left standing verbatim, because
 *   the server leaves it standing too. Showing it as blank -- or as an error --
 *   would tell the admin the opposite of what will be delivered;
 * - replacement is literal. `split`/`join` is used instead of `replaceAll` with
 *   a string replacement because `replaceAll` interprets `$&`, `` $` ``, `$'`
 *   and `$$` *in the replacement*, so a sample value containing a dollar sign
 *   would render differently here than on the server.
 *
 * A null/absent template renders as the empty string; the caller decides how to
 * present "nothing configured".
 */
export function renderNotificationTemplate(
    template: string | null | undefined,
    sampleValues: Readonly<Record<string, string>>,
): string {
    let rendered = template ?? "";
    for (const [name, value] of Object.entries(sampleValues)) {
        rendered = rendered.split(variableToken(name)).join(value);
    }
    return rendered;
}

/** The new field value and where the caret belongs afterwards. */
export type VariableInsertion = {
    /** Offset the caret is placed at: immediately after the inserted token. */
    caret: number;
    value: string;
};

/**
 * `$name$` inserted into `text` at the caret, replacing whatever the selection
 * covered. Offsets are clamped and ordered rather than trusted: `selectionStart`
 * and `selectionEnd` are `null` on an input that has never been focused, and a
 * value the form changed underneath the field can leave a stale offset past its
 * end.
 */
export function insertVariable(
    text: string | null | undefined,
    name: string,
    selection: {end: number | null; start: number | null},
): VariableInsertion {
    const value = text ?? "";
    const token = variableToken(name);
    const clamp = (offset: number | null): number =>
        offset === null
            ? value.length
            : Math.min(Math.max(offset, 0), value.length);
    const first = clamp(selection.start);
    const second = clamp(selection.end);
    const start = Math.min(first, second);
    const end = Math.max(first, second);
    return {
        caret: start + token.length,
        value: `${value.slice(0, start)}${token}${value.slice(end)}`,
    };
}
