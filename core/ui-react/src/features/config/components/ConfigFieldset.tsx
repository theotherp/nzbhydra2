import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
    Box,
    Button,
    Collapse,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import {useCallback, useMemo, useState} from "react";

import {useShowAdvanced} from "../advancedFields";
import {
    AdvancedDisclosureContext,
    FULLY_REVEALED_ADVANCED_DISCLOSURE,
    NO_ADVANCED_REVEAL_REQUEST,
    revealRequestMatches,
    useAdvancedRevealRequest,
    type AdvancedDisclosure,
} from "./advancedDisclosure";
import {advancedExpanderTestId, fieldsetTestId} from "./settings";

/**
 * `C-CONFIG-FIELDS`: a titled group of settings — the replacement for legacy's
 * `fieldset-wrapper.html`.
 *
 * Legacy simply dropped whatever the advanced toggle hid
 * (`ng-show="model.showAdvanced || !to.advanced"` on the `<fieldset>` and on
 * each row), so a setting a user had never turned the toggle on for was
 * undiscoverable. FM-098 keeps the global toggle's semantics exactly — on, every
 * advanced setting is shown everywhere — and replaces the silent drop with a
 * disclosure: a fieldset that is hiding advanced rows offers "N advanced
 * settings hidden", and a fieldset that is *itself* advanced offers itself.
 * Expansion is this component's own state on purpose: it is a momentary "show me
 * that one thing", not a preference, and the toggle remains the thing that
 * persists.
 */
export function ConfigFieldset({
    advanced,
    children,
    label,
    tooltip,
}: {
    advanced?: boolean;
    children: React.ReactNode;
    label: string;
    tooltip?: string;
}) {
    const showAdvanced = useShowAdvanced();
    const [revealed, setRevealed] = useState(false);
    // The registrations of the advanced rows the global toggle is currently
    // hiding, held as a bag of keys rather than a set: a doubly-invoked effect
    // and a repeated path both settle at the right *number*. The count below is
    // read straight off this state on every render — memoizing it would freeze
    // the answer across exactly the churn it exists to follow (a `useWatch`-gated
    // advanced row appearing or disappearing while the tab is open).
    const [hiddenRowKeys, setHiddenRowKeys] = useState<readonly string[]>([]);
    const registerHiddenAdvancedRow = useCallback((key: string) => {
        setHiddenRowKeys((keys) => [...keys, key]);
        return () =>
            setHiddenRowKeys((keys) => {
                const index = keys.indexOf(key);
                return index < 0
                    ? keys
                    : [...keys.slice(0, index), ...keys.slice(index + 1)];
            });
    }, []);
    const disclosure = useMemo<AdvancedDisclosure>(
        () => ({registerHiddenAdvancedRow, revealed}),
        [registerHiddenAdvancedRow, revealed],
    );
    const hiddenCount = hiddenRowKeys.length;

    // FM-099: settings search asking this fieldset to open, so a hit on a row
    // the global toggle is hiding can be scrolled to. It only ever opens --
    // a request never collapses a fieldset the admin opened themselves -- and
    // it changes nothing but this component's own momentary state, which is
    // why the global toggle's stored preference is untouched by a search.
    //
    // Applied while rendering rather than from an effect: React's documented
    // way to adjust state when an incoming value changes. An effect would
    // paint the collapsed fieldset first and only then open it, and each
    // request is a token that must be acted on exactly once -- honouring it
    // again would re-open a fieldset the admin had since collapsed by hand.
    //
    // The marker starts at the *no request* token rather than at the live one:
    // a cross-tab search bumps the token before the router mounts the target
    // tab's bodies, so every fieldset over there mounts with a request already
    // outstanding. Seeding from the live token would make each of them believe
    // it had already honoured that request and skip the reveal — the whole
    // cross-tab case, which is most of them (the global toggle is off by
    // default). `NO_ADVANCED_REVEAL_REQUEST.token` is the one value no live
    // request can carry: `navigateToSetting` bumps before it ever hands a
    // request out, so a real one is always greater.
    const revealRequest = useAdvancedRevealRequest();
    const [honouredRequest, setHonouredRequest] = useState(
        NO_ADVANCED_REVEAL_REQUEST.token,
    );
    if (honouredRequest !== revealRequest.token) {
        setHonouredRequest(revealRequest.token);
        if (revealRequestMatches(revealRequest, label)) {
            setRevealed(true);
        }
    }

    const fieldset = (
        <Box
            component="fieldset"
            data-testid={fieldsetTestId(label)}
            // A native `<fieldset>`/`<legend>` pair is the semantic grouping
            // for a set of related form controls, and it is what assistive
            // technology announces. Its user-agent border and inset padding are
            // browser chrome rather than a design decision, so they are reset
            // here; everything visible comes from the theme.
            sx={{border: 0, m: 0, p: 0, pt: 1}}
        >
            <Stack
                alignItems="center"
                component="legend"
                direction="row"
                spacing={0.5}
                sx={{pb: 1}}
            >
                <Typography component="span" variant="h6">
                    {label}
                </Typography>
                {tooltip === undefined ? null : (
                    <Tooltip title={tooltip}>
                        <IconButton
                            aria-label={`About ${label}`}
                            data-testid={`config-fieldset-tooltip-${label.toLowerCase()}`}
                            size="small"
                        >
                            <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
            {children}
            {hiddenCount === 0 ? null : (
                <AdvancedExpander
                    expanded={revealed}
                    label={
                        revealed
                            ? `Hide ${advancedSettings(hiddenCount)}`
                            : `${advancedSettings(hiddenCount)} hidden`
                    }
                    onToggle={() => setRevealed((open) => !open)}
                    testId={advancedExpanderTestId(label)}
                />
            )}
        </Box>
    );

    if (advanced === true && !showAdvanced) {
        // A whole advanced fieldset: the group announces itself by name and
        // stays out of the way until asked for. Its own test id appears only
        // once it is revealed — collapsed, there is no fieldset on the page,
        // which is exactly what it looked like before this feature.
        return (
            <Box sx={{pt: 1}}>
                <AdvancedExpander
                    expanded={revealed}
                    label={
                        revealed
                            ? `Hide ${label}`
                            : `${label} — advanced, hidden`
                    }
                    onToggle={() => setRevealed((open) => !open)}
                    testId={advancedExpanderTestId(label)}
                />
                <Collapse in={revealed} unmountOnExit>
                    <AdvancedDisclosureContext.Provider
                        value={FULLY_REVEALED_ADVANCED_DISCLOSURE}
                    >
                        {fieldset}
                    </AdvancedDisclosureContext.Provider>
                </Collapse>
            </Box>
        );
    }

    return (
        <AdvancedDisclosureContext.Provider value={disclosure}>
            {fieldset}
        </AdvancedDisclosureContext.Provider>
    );
}

function advancedSettings(count: number): string {
    return `${count} advanced ${count === 1 ? "setting" : "settings"}`;
}

/**
 * The disclosure control itself: a stock text `Button` whose caption is the
 * whole affordance, with `aria-expanded` and a chevron that follows the state
 * rather than a rotation of one icon, so nothing here is a design decision.
 */
function AdvancedExpander({
    expanded,
    label,
    onToggle,
    testId,
}: {
    expanded: boolean;
    label: string;
    onToggle: () => void;
    testId: string;
}) {
    return (
        <Button
            aria-expanded={expanded}
            data-testid={testId}
            onClick={onToggle}
            size="small"
            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{mb: 2.5}}
            type="button"
        >
            {label}
        </Button>
    );
}
