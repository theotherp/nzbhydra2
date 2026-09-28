/**
 * The row-hover half of the reveal rule described in `CopyValueButton.tsx`
 * (the focus half is authored on the button itself, `&.Mui-focusVisible`).
 * Spread onto a consuming row's own `sx` -- e.g. a `TableRow` -- to reveal
 * every `CopyValueButton` it contains on hover, without a mouse user having
 * to tab to one first. ADR-0014: this is a state toggle (`opacity`), never a
 * colour, so it needs no theme token.
 */
export const rowRevealsCopyButtonsOnHover = {
    "&:hover .copy-value-button": {opacity: 1},
} as const;
