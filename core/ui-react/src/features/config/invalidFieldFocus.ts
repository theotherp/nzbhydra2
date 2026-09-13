import type {Control} from "react-hook-form";

import type {ConfigValues} from "../../api/config/schema";

/**
 * Moving the caret to the control that refused an editor dialog's draft.
 *
 * The editor dialogs (indexer, downloader, external tool, category, user) all
 * refuse an invalid draft the same way: `trigger()` returns false, a toast
 * says "Config invalid. Please check your settings.", and nothing else
 * happens. In the ~30-field indexer dialog the setting that is actually
 * invalid is usually scrolled out of view behind the toast, so the report
 * names nothing and is gone a moment later.
 *
 * The shell's own rejection banner solves the same problem by listing the
 * offending settings (FM-101), but a dialog has no banner region — it is a
 * modal over a single entry — so the equivalent there is to put the caret on
 * the field, which scrolls it into view and announces it in one act.
 */

/**
 * Focus the control behind the first error React Hook Form recorded, if any.
 *
 * Reads `control._formState` rather than the `formState` a component holds:
 * the latter is a snapshot taken at render time, and the caller is standing in
 * the tick right after `await trigger()`, before React has re-rendered with
 * the errors that call produced. Measured, not assumed — against the rendered
 * `formState` this walk sees an empty tree and focuses nothing.
 *
 * It walks the tree and focuses the DOM node the first leaf error carries.
 * React Hook Form stores that node on the error itself, so this needs no field
 * path and cannot name one the form does not have — `setFocus` throws for an
 * unregistered path. The tree's key order is the order the fields registered
 * in, which in these dialogs is the order they are rendered in, so "first" is
 * the topmost invalid control.
 *
 * Every config control forwards `field.ref` to its input (`TextSetting`,
 * `NumberSetting`, `SelectSetting`, and the rest), so the node is a real,
 * focusable element. A control that ever stops doing so simply is not focused;
 * the toast still reports the refusal.
 *
 * @returns whether a control was focused.
 */
export function focusFirstInvalidField(
    control: Control<ConfigValues>,
): boolean {
    return focusFirstErrorRef(control._formState.errors);
}

function focusFirstErrorRef(errors: unknown): boolean {
    if (errors === null || typeof errors !== "object") {
        return false;
    }
    const node = errors as Record<string, unknown>;
    const ref = node.ref;
    if (
        ref !== null &&
        typeof ref === "object" &&
        typeof (ref as {focus?: unknown}).focus === "function"
    ) {
        (ref as {focus: () => void}).focus();
        return true;
    }
    for (const [key, value] of Object.entries(node)) {
        // Never descend into a `ref` that turned out not to be focusable: it
        // is a DOM node, not a branch of the error tree.
        if (key !== "ref" && focusFirstErrorRef(value)) {
            return true;
        }
    }
    return false;
}
