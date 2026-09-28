/**
 * Legacy's model format (`formly-config.js:290-322`, `colorInput`): the config
 * holds `rgb(r,g,b)` or `null`, never an alpha channel and never the `#rrggbb`
 * a native colour input speaks. `rgbToHex`/`hexToRgb` convert only for the
 * picker's own seed and write, and only on an explicit pick.
 */
const RGB_PATTERN = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;

function clampByte(value: number): number {
    return Math.min(255, Math.max(0, Math.round(value)));
}

function toHexByte(value: number): string {
    return clampByte(value).toString(16).padStart(2, "0");
}

/** A stored `rgb(r,g,b)` string as `#rrggbb`, or `null` for anything else. */
export function rgbToHex(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const match = RGB_PATTERN.exec(value.trim());
    if (match === null) {
        return null;
    }
    const [, r, g, b] = match;
    return `#${toHexByte(Number(r))}${toHexByte(Number(g))}${toHexByte(Number(b))}`;
}

/** A native colour input's `#rrggbb` value as legacy's `rgb(r,g,b)` string. */
export function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r},${g},${b})`;
}
