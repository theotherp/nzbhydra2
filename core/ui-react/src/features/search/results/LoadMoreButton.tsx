import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {Button, ButtonGroup, Menu, MenuItem} from "@mui/material";
import {useId, useState} from "react";

/**
 * "Load more", split: the button loads the server's configured page as it
 * always did, and the caret offers the larger round amounts
 * `loadMoreAmounts` picked for this search. Without any amount to offer the
 * caret is not rendered and the control looks like the plain button it was.
 *
 * Same split-button anatomy as "Send to downloader" (`DownloadActions`), but
 * `text` like the "Load all results" button beside it, so the row keeps one
 * button style. `footer` is the phone's full-width copy under the last card,
 * whose menu opens upwards.
 */
export function LoadMoreButton({
    amounts,
    footer = false,
    onLoadAmount,
    onLoadMore,
    pagingAvailable,
    pagingLoading,
}: {
    amounts: number[];
    footer?: boolean;
    onLoadAmount: (amount: number) => void;
    onLoadMore: () => void;
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
            {pagingLoading ? "Loading more results…" : "Load more"}
        </Button>
    );
    return (
        <>
            <ButtonGroup
                data-testid="results-load-more-group"
                size="small"
                sx={footer ? {display: "flex"} : undefined}
                variant="text"
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
                        // The caret is an icon, not a label: the stock minimum
                        // width would make it as wide as a short word.
                        sx={{minWidth: 0, px: 0.5}}
                    >
                        <ArrowDropDownIcon fontSize="small" />
                    </Button>
                )}
            </ButtonGroup>
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
