import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {Box, Button, Menu, MenuItem} from "@mui/material";
import {useId, useState} from "react";

/**
 * "Load N more", split: the button loads `pageSize` (1000, the server's
 * default for a continuation), and the caret offers the larger round amounts
 * `loadMoreAmounts` picked for this search. Without any amount to offer the
 * caret is not rendered and the control looks like the plain button it was.
 *
 * Two plain `text` buttons side by side, like the "Load all results" button
 * beside them, so the row keeps one button style. Not a `ButtonGroup`: its
 * `text` variant draws a divider the full height of the buttons, about twice
 * the height of the text, between "Load more" and its caret (owner request).
 * `footer` is the phone's full-width copy under the last card, whose menu
 * opens upwards.
 */
export function LoadMoreButton({
    amounts,
    footer = false,
    onLoadAmount,
    onLoadMore,
    pageSize,
    pagingAvailable,
    pagingLoading,
}: {
    amounts: number[];
    footer?: boolean;
    onLoadAmount: (amount: number) => void;
    onLoadMore: () => void;
    pageSize: number;
    pagingAvailable: boolean;
    pagingLoading: boolean;
}) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const menuId = useId();
    const disabled = !pagingAvailable || pagingLoading;
    const loadButton = (
        <Button
            aria-busy={pagingLoading}
            data-testid="results-load-more"
            disabled={disabled}
            onClick={onLoadMore}
            size="small"
            sx={footer ? {flex: 1} : undefined}
        >
            {pagingLoading ? "Loading more results…" : `Load ${pageSize} more`}
        </Button>
    );
    return (
        <>
            <Box
                data-testid="results-load-more-group"
                sx={{display: footer ? "flex" : "inline-flex"}}
            >
                {loadButton}
                {/* Always the same tree, so the main button keeps its DOM
                    node (and focus) when the amounts come and go. */}
                {amounts.length > 0 && (
                    <Button
                        aria-controls={menuAnchor ? menuId : undefined}
                        aria-expanded={menuAnchor ? "true" : "false"}
                        aria-haspopup="menu"
                        aria-label="More load options"
                        data-testid="results-load-more-options"
                        disabled={disabled}
                        onClick={(event) => setMenuAnchor(event.currentTarget)}
                        size="small"
                        // The caret is an icon, not a label: the stock minimum
                        // width would make it as wide as a short word.
                        sx={{minWidth: 0, px: 0.5}}
                    >
                        <ArrowDropDownIcon fontSize="small" />
                    </Button>
                )}
            </Box>
            <Menu
                anchorEl={menuAnchor}
                id={menuId}
                anchorOrigin={{
                    horizontal: "right",
                    vertical: footer ? "top" : "bottom",
                }}
                onClose={() => setMenuAnchor(null)}
                open={Boolean(menuAnchor)}
                transformOrigin={{
                    horizontal: "right",
                    vertical: footer ? "bottom" : "top",
                }}
            >
                {amounts.map((amount) => (
                    <MenuItem
                        data-testid={`results-load-amount-${amount}`}
                        key={amount}
                        onClick={() => {
                            setMenuAnchor(null);
                            onLoadAmount(amount);
                        }}
                    >
                        Load {amount} more
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}
