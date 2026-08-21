import {defaultStatsWindow} from "../../../api/stats/mainStats";

export const DATE_PRESETS = [
    {id: "last7", label: "Last 7 days", days: 7},
    {id: "last30", label: "Last 30 days", days: 30},
    {id: "last90", label: "Last 90 days", days: 90},
    {id: "lastYear", label: "Last year", days: 365},
    {id: "allTime", label: "All time", days: null},
    {id: "custom", label: "Custom", days: undefined},
] as const;

export type DatePresetId = (typeof DATE_PRESETS)[number]["id"];

export type DateRange = {after: Date; before: Date};

/**
 * Every preset shares legacy's "before" edge (tomorrow, client clock) --
 * matching `defaultStatsWindow`'s own "before" -- and only varies "after".
 * "All time" sends the epoch so the backend applies no lower bound in
 * practice.
 */
export function rangeForPreset(
    preset: DatePresetId,
    now: Date = new Date(),
): DateRange | undefined {
    const {before} = defaultStatsWindow(now);
    if (preset === "custom") return undefined;
    if (preset === "allTime") return {after: new Date(0), before};
    const entry = DATE_PRESETS.find((candidate) => candidate.id === preset);
    if (!entry || typeof entry.days !== "number") return undefined;
    const after = new Date(now);
    after.setDate(after.getDate() - entry.days);
    return {after, before};
}

export type CustomDateInput = {after: string; before: string};

export type CustomDateValidation =
    | {valid: true; range: DateRange}
    | {valid: false; error: string};

/**
 * Validates a Custom range's two `<input type="date">` values: both must
 * parse and `after` must be strictly before `before` (Presentation
 * Structure: "Invalid ranges (after >= before, unparseable input) are
 * flagged inline and never sent").
 */
export function validateCustomRange(
    input: CustomDateInput,
): CustomDateValidation {
    const after = parseDateInput(input.after);
    const before = parseDateInput(input.before);
    if (!after || !before) {
        return {valid: false, error: "Enter a complete, valid date range."};
    }
    if (after.getTime() >= before.getTime()) {
        return {
            valid: false,
            error: "The After date must be earlier than the Before date.",
        };
    }
    return {valid: true, range: {after, before}};
}

function parseDateInput(value: string): Date | undefined {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function toDateInputValue(date: Date): string {
    const year = date.getFullYear().toString().padStart(4, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
}
