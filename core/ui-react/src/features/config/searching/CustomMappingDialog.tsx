import ScienceIcon from "@mui/icons-material/Science";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Stack,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import {useState} from "react";

import {
    testCustomMapping,
    type CustomMappingValues,
} from "../../../api/config/customMappingTest";
import {ApiTransport} from "../../../api/transport";
import {
    AFFECTED_VALUE_OPTIONS,
    CUSTOM_MAPPING_HELP,
    EMPTY_EXAMPLE_INPUT_RESULT,
    EMPTY_INPUT_PATTERN_RESULT,
    MAPPING_SEARCH_TYPE_OPTIONS,
    NO_MATCH_RESULT,
    REQUEST_FAILED_RESULT,
} from "./searchingSettings";

/** The `data-testid` of every control in the dialog. */
export const MAPPING_DIALOG_TEST_ID = "config-custom-mapping-dialog";

type TestOutcome = {failed: boolean; text: string};

/**
 * `F-CONFIG-SEARCHING`'s custom-mapping editor: legacy's "Help and test" modal
 * (`custom-mapping-help.html`, wired in `formly-config.js` `customMappingTest`)
 * carrying every field of the mapping entry.
 *
 * It is a **transaction**, which is the reason this list section is a modal at
 * all. Legacy clones the entry (`structuredClone(model)`), binds the modal to
 * the clone, and only writes it back with `Object.assign(model, $scope.model)`
 * on submit; cancelling closes the modal and the clone is discarded. The same
 * shape here: the dialog owns a draft in local state and never touches
 * `C-CONFIG-FORM`, so nothing an admin types — and no test they run — can reach
 * the configuration until they submit. `onSubmit` is what writes, and only the
 * section that owns the array calls into the form.
 *
 * The draft is deliberately *not* React Hook Form state. It is not part of the
 * configuration until it is committed, and giving it its own nested form would
 * put the uncommitted values into a form the shell's save could reach.
 */
export function CustomMappingDialog({
    initialValue,
    onCancel,
    onSubmit,
    submitLabel,
    transport,
}: {
    initialValue: CustomMappingValues;
    onCancel: () => void;
    onSubmit: (mapping: CustomMappingValues) => void;
    /** "Add" for a new entry, "Submit" when an existing one is being edited. */
    submitLabel: string;
    transport: ApiTransport;
}) {
    const [draft, setDraft] = useState<CustomMappingValues>(() => ({
        ...initialValue,
    }));
    const [exampleInput, setExampleInput] = useState("");
    const [outcome, setOutcome] = useState<TestOutcome | null>(null);
    const [testing, setTesting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const update = <TKey extends keyof CustomMappingValues>(
        key: TKey,
        value: CustomMappingValues[TKey],
    ) => setDraft((current) => ({...current, [key]: value}));

    const missing = {
        affectedValue: isBlank(draft.affectedValue),
        from: isBlank(draft.from),
        to: isBlank(draft.to),
    };
    const invalid = missing.affectedValue || missing.from || missing.to;

    const submit = () => {
        setSubmitted(true);
        if (invalid) {
            return;
        }
        onSubmit({...draft});
    };

    const runTest = async () => {
        // Both guards answer without a request. Legacy has the first one
        // (`formly-config.js:362-366`) and reports it in the same place a
        // server answer appears; the second exists because the endpoint
        // dereferences `from` outside its `try` and would answer HTTP 500.
        if (exampleInput === "") {
            setOutcome({failed: true, text: EMPTY_EXAMPLE_INPUT_RESULT});
            return;
        }
        if (isBlank(draft.from)) {
            setOutcome({failed: true, text: EMPTY_INPUT_PATTERN_RESULT});
            return;
        }
        setTesting(true);
        try {
            const result = await testCustomMapping(transport, {
                exampleInput,
                mapping: draft,
            });
            if (result.kind === "match") {
                setOutcome({failed: false, text: result.output});
            } else if (result.kind === "noMatch") {
                setOutcome({failed: false, text: NO_MATCH_RESULT});
            } else {
                setOutcome({failed: true, text: result.message});
            }
        } catch {
            setOutcome({failed: true, text: REQUEST_FAILED_RESULT});
        } finally {
            setTesting(false);
        }
    };

    return (
        <Dialog
            data-testid={MAPPING_DIALOG_TEST_ID}
            fullWidth
            maxWidth="sm"
            onClose={onCancel}
            open
        >
            <DialogTitle>
                Custom query and title mapping help and test
            </DialogTitle>
            <DialogContent dividers>
                <Alert
                    data-testid="config-custom-mapping-help"
                    severity="info"
                    sx={{mb: 2.5}}
                    variant="outlined"
                >
                    <Stack component="ul" spacing={0.5} sx={{m: 0, pl: 2.5}}>
                        {CUSTOM_MAPPING_HELP.map((line) => (
                            <Typography
                                component="li"
                                key={line}
                                variant="body2"
                            >
                                {line}
                            </Typography>
                        ))}
                    </Stack>
                </Alert>
                <Stack spacing={2.5}>
                    <TextField
                        data-testid="config-custom-mapping-affectedValue"
                        error={submitted && missing.affectedValue}
                        helperText={
                            submitted && missing.affectedValue
                                ? "This field is required"
                                : "Determines which value of the search request or result will be processed"
                        }
                        label="Affected value"
                        onChange={(event) =>
                            update("affectedValue", event.target.value)
                        }
                        required
                        select
                        value={draft.affectedValue ?? ""}
                    >
                        {AFFECTED_VALUE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </TextField>
                    {/*
                     * Legacy's `hideExpression: 'model.affectedValue ===
                     * "RESULT_TITLE"'`: a result title has no search type. The
                     * draft keeps whatever was stored while the control is
                     * hidden, so switching to a result title and back does not
                     * silently erase it.
                     */}
                    {draft.affectedValue === "RESULT_TITLE" ? null : (
                        <TextField
                            data-testid="config-custom-mapping-searchType"
                            helperText="Determines in what context the mapping will be executed"
                            label="Search type"
                            onChange={(event) =>
                                update("searchType", event.target.value)
                            }
                            select
                            value={draft.searchType ?? ""}
                        >
                            {MAPPING_SEARCH_TYPE_OPTIONS.map((option) => (
                                <MenuItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                    <Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={draft.matchAll}
                                    data-testid="config-custom-mapping-matchAll"
                                    onChange={(event) =>
                                        update("matchAll", event.target.checked)
                                    }
                                />
                            }
                            label="Match whole string"
                        />
                        <Typography component="p" variant="body2">
                            If true then the input pattern must match the whole
                            affected value. If false then any match will be
                            replaced, even if it&apos;s only part of the
                            affected value.
                        </Typography>
                    </Box>
                    <TextField
                        error={submitted && missing.from}
                        helperText={
                            submitted && missing.from
                                ? "This field is required"
                                : // Legacy's own "output puttern" typo
                                  // (`config-fields-service.js:1365`), kept
                                  // verbatim for the parity comparison; see
                                  // the handoff's follow-up work.
                                  "Pattern which must match the query or title of a search request (completely or in part, depending on the previous setting). You may use regexes in groups which can be referenced in the output puttern by using {group:regex}. Case insensitive."
                        }
                        label="Input pattern"
                        onChange={(event) => update("from", event.target.value)}
                        required
                        slotProps={{
                            htmlInput: {
                                "data-testid": "config-custom-mapping-from",
                            },
                        }}
                        value={draft.from ?? ""}
                    />
                    <TextField
                        error={submitted && missing.to}
                        helperText={
                            submitted && missing.to
                                ? "This field is required"
                                : "If a query or title matches the input pattern it will be replaced using this. You may reference groups from the input pattern by using {group}. Additionally you may use {season:0} or {season:00} or {episode:0} or {episode:00} (with and without leading zeroes). Use <remove> to remove the match."
                        }
                        label="Output pattern"
                        onChange={(event) => update("to", event.target.value)}
                        required
                        slotProps={{
                            htmlInput: {
                                "data-testid": "config-custom-mapping-to",
                            },
                        }}
                        value={draft.to ?? ""}
                    />
                    <TextField
                        helperText="Tested against the patterns above. Nothing is saved by testing."
                        label="Example query/title"
                        onChange={(event) =>
                            setExampleInput(event.target.value)
                        }
                        slotProps={{
                            htmlInput: {
                                "data-testid":
                                    "config-custom-mapping-exampleInput",
                            },
                        }}
                        value={exampleInput}
                    />
                    <Box>
                        <Button
                            data-testid="config-custom-mapping-test"
                            disabled={testing}
                            onClick={() => void runTest()}
                            startIcon={<ScienceIcon />}
                            type="button"
                            variant="outlined"
                        >
                            Test
                        </Button>
                    </Box>
                    <TextField
                        error={outcome?.failed === true}
                        helperText={
                            outcome === null
                                ? "The result of the last test."
                                : undefined
                        }
                        label="Result"
                        slotProps={{
                            htmlInput: {
                                "data-testid": "config-custom-mapping-result",
                                readOnly: true,
                            },
                        }}
                        value={outcome?.text ?? ""}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    data-testid="config-custom-mapping-cancel"
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </Button>
                <Button
                    data-testid="config-custom-mapping-submit"
                    onClick={submit}
                    type="button"
                    variant="contained"
                >
                    {submitLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function isBlank(value: string | null): boolean {
    return value === null || value.trim() === "";
}
