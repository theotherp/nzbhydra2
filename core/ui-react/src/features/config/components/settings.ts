import {useContext} from "react";
import type {FieldPath, RegisterOptions} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SafeConfigContext} from "../../../bootstrap";

/**
 * `C-CONFIG-FIELDS`, the shared vocabulary's contract. ADR-0002 asks for "a
 * small typed field vocabulary, not a generic schema framework": there is one
 * component per *control kind*, never one per field, and a tab is ordinary JSX
 * naming the kinds it needs. Nothing here reads or writes a config value of
 * its own — every control binds through `C-CONFIG-FORM`'s single React Hook
 * Form by path, so the whole-config round trip stays lossless.
 */

/** A React Hook Form path into the whole `BaseConfig`, e.g. `main.logging.logGc`. */
export type ConfigFieldPath = FieldPath<ConfigValues>;

/**
 * Help text below a control. Legacy writes it as an HTML fragment and pipes it
 * through `derefererExtracting | unsafe` (`setting-wrapper.html`); React models
 * the same content as text runs and links instead, so no configuration string
 * is ever interpreted as markup and every link still goes through
 * `C-EXTERNAL-LINKS`.
 */
export type HelpLink = {href: string; text: string};
export type HelpContent = string | ReadonlyArray<string | HelpLink>;

/** `true` when valid, otherwise the message the row shows below the control. */
export type SettingValidator = (value: unknown) => true | string;

export type SettingProps = {
    /**
     * Hidden unless the shell's advanced toggle is on. A property of the *row*,
     * not of the config: hiding never touches the value behind it.
     */
    advanced?: boolean;
    help?: HelpContent;
    label: string;
    name: ConfigFieldPath;
    required?: boolean;
    /** Extra explanation behind a focusable affordance next to the control. */
    tooltip?: string;
    validate?: SettingValidator;
};

/**
 * The stable part of a setting's `data-testid`, derived from its config path so
 * a selector can be predicted from `config-fields-service.js` without a lookup
 * table: `main.logging.logGc` becomes `main-logging-logGc`.
 */
export function settingTestId(name: string): string {
    return name.replaceAll(".", "-");
}

/** The row wrapper's test id (`config-setting-main-host`). */
export function settingRowTestId(name: string): string {
    return `config-setting-${settingTestId(name)}`;
}

/** The editable control's test id (`config-input-main-host`). */
export function settingInputTestId(name: string): string {
    return `config-input-${settingTestId(name)}`;
}

/**
 * Element ids for `SettingRow`'s help and error text, used only to build
 * `aria-describedby` — not test selectors. The error id doubles as that
 * element's existing `config-error-<path>` test id (same string, two
 * attributes on the same node); the help id has no test-id counterpart since
 * legacy had none to preserve.
 */
export function settingErrorId(name: string): string {
    return `config-error-${settingTestId(name)}`;
}

export function settingHelpId(name: string): string {
    return `config-help-${settingTestId(name)}`;
}

/**
 * The `aria-describedby` value a control should carry given which of its
 * row's help/error text is actually rendered, so a screen reader announces
 * *why* a field is invalid rather than only that it is.
 */
export function settingDescribedBy(
    name: string,
    {hasError, hasHelp}: {hasError: boolean; hasHelp: boolean},
): string | undefined {
    const ids = [
        hasHelp ? settingHelpId(name) : null,
        hasError ? settingErrorId(name) : null,
    ].filter((id): id is string => id !== null);
    return ids.length === 0 ? undefined : ids.join(" ");
}

/**
 * The live dereferer, read through `C-BOOTSTRAP-CONTEXT` so a post-save
 * refresh reaches it (ADR-0017) and never copied into state. Read from the
 * context directly rather than through `useSafeConfig`, because the config
 * area is mounted without a `BootstrapData` prop to fall back to; a focused
 * component test rendered without the provider simply applies no dereferer,
 * which is also what an instance with none configured does.
 */
export function useDereferer(): unknown {
    return useContext(SafeConfigContext)?.dereferer;
}

/**
 * The React Hook Form rules every control kind registers. `required`'s message
 * is legacy's own (`formly-config.js`: `addStringMessage('required', 'This
 * field is required')`), and an invalid field is what blocks the save
 * (`config-controller.js:158-189`).
 */
export function settingRules({
    required,
    validate,
}: {
    required?: boolean;
    validate?: SettingValidator;
}): RegisterOptions<ConfigValues, ConfigFieldPath> {
    return {
        ...(required === true ? {required: "This field is required"} : {}),
        ...(validate === undefined ? {} : {validate}),
    };
}

/** A config value rendered into a text input; `null` is an empty field. */
export function textValue(value: unknown): string {
    return value === null || value === undefined ? "" : String(value);
}

/** A config value rendered into a list control; anything else is an empty list. */
export function listValue(value: unknown): string[] {
    return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

/**
 * Legacy's `min` template option (`config-fields-service.js`), as a validator
 * with a message: Formly registered the HTML5 `min` attribute but declared no
 * message for it, so the field went silently invalid and only the generic
 * "Config invalid" growl appeared on save.
 */
export function minimumValidator(minimum: number): SettingValidator {
    return (value) =>
        typeof value === "number" && value < minimum
            ? `Must be at least ${minimum}`
            : true;
}

/**
 * Legacy's `regexValidator` for a non-empty value (`config-fields-service.js`).
 * An empty value is always accepted here; `required` is what rejects it.
 */
export function patternValidator(
    pattern: RegExp,
    message: (value: string) => string,
): SettingValidator {
    return (value) => {
        if (value === null || value === undefined || value === "") {
            return true;
        }
        const text = String(value);
        return pattern.test(text) ? true : message(text);
    };
}
