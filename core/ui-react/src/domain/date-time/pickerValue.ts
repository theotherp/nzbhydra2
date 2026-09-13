import dayjs, {type Dayjs} from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

/*
 * `AdapterDayjs` registers this plugin itself, but this module is used by
 * plain unit tests and by state code that runs before any picker mounts, so
 * it registers it too: without it `dayjs(value, format, true)` silently
 * ignores both the format and the strict flag and falls back to the loose
 * constructor, which happily accepts "2026-01" as a date.
 */
dayjs.extend(customParseFormat);

/**
 * The storage format of the stats Custom range's two values -- what
 * `<input type="date">` used to produce, what `dateRange.ts`'s
 * `parseDateInput` still consumes, and what `statsQueryKey` hashes.
 */
export const DATE_VALUE_FORMAT = "YYYY-MM-DD";

/**
 * The storage format of the history refine surface's two time values -- what
 * `<input type="datetime-local">` used to produce, what
 * `api/history/filters.ts`'s `toServerTime` turns into the request instant,
 * and what `historySearchParams.ts` puts in the URL.
 */
export const DATE_TIME_VALUE_FORMAT = "YYYY-MM-DDTHH:mm";

/**
 * What a reader types and reads in the two pickers. Deliberately independent
 * of the storage formats above and of the reader's locale: a fixed
 * `YYYY-MM-DD` keeps keyboard entry unambiguous, and the history field's
 * space-separated 24-hour clock is FM-174's rule (`C-DATE-TIME`) rather than
 * the `T` the wire format carries.
 */
export const DATE_DISPLAY_FORMAT = "YYYY-MM-DD";
export const DATE_TIME_DISPLAY_FORMAT = "YYYY-MM-DD HH:mm";

/**
 * A stored string as a picker value. Anything the format does not match
 * exactly -- an empty field, a half-typed date, a value some other
 * application wrote into the URL -- is `null`, which is the picker's own
 * "no value" and never a date the reader did not choose.
 */
export function pickerValueOf(value: string, format: string): Dayjs | null {
    if (!value) return null;
    const parsed = dayjs(value, format, true);
    return parsed.isValid() ? parsed : null;
}

/**
 * A picker value as the stored string. `null` (cleared) and an invalid or
 * incomplete `Dayjs` both write `""`, which is exactly what the native inputs
 * reported for the same states, so every consumer of these strings keeps
 * seeing the two cases it already handles.
 */
export function pickerValueString(value: Dayjs | null, format: string): string {
    return value?.isValid() ? value.format(format) : "";
}

/**
 * The slot props every MUI X picker in this application renders with
 * (owner request 2026-09-04). `clearable`: one "Clear" press empties the
 * whole value, where deleting section by section was the only way to reset
 * a date-time. The two `small` sizes bring the calendar button and its glyph
 * down to the scale of the other 32px form controls (`app/theme.ts`
 * `MuiPickersInputBase` carries the height and text size themselves).
 */
export const pickerFieldSlotProps = {
    clearButton: {size: "small"},
    clearIcon: {fontSize: "small"},
    field: {clearable: true},
    openPickerButton: {size: "small"},
    openPickerIcon: {fontSize: "small"},
} as const;
