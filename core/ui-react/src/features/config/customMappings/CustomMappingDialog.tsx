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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import {useState} from "react";

import {
    testCustomMappings,
    type CustomMappingChainOutcome,
    type CustomMappingOutcome,
    type CustomMappingTestLine,
    type CustomMappingValues,
} from "../../../api/config/customMappingTest";
import {ApiTransport} from "../../../api/transport";
import {
    AFFECTED_VALUE_OPTIONS,
    CUSTOM_MAPPING_HELP,
    customMappingLegend,
    EMPTY_EXAMPLE_INPUT_RESULT,
    EMPTY_INPUT_PATTERN_RESULT,
    MAPPING_SEARCH_TYPE_OPTIONS,
    NO_MAPPING_APPLIED,
    NO_MATCH_RESULT,
    NO_SINGLE_ANSWER_RESULT,
    REQUEST_FAILED_RESULT,
} from "./customMappingSettings";

/** The `data-testid` of the dialog itself. */
const MAPPING_DIALOG_TEST_ID = "config-custom-mapping-dialog";

/** The result table, and one row of it per example line. */
const RESULTS_TEST_ID = "config-custom-mapping-results";

function resultRowTestId(line: number): string {
    return `config-custom-mapping-result-${line}`;
}

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
 *
 * FM-195 adopted FM-194's batch test contract. The examples are no longer a
 * throwaway field beside the mapping: they are part of it, saved with it, and
 * every line is run both through this mapping alone and through the whole
 * edited list — which is why `entries` and `index` are props. The list sent is
 * the one on screen, unsaved edits to *other* mappings included, so the chain
 * column answers for what a save would produce rather than for what is stored.
 */
export function CustomMappingDialog({
    entries,
    index,
    initialValue,
    onCancel,
    onSubmit,
    submitLabel,
    transport,
}: {
    /** The whole list as the form holds it, in configured order. */
    entries: readonly CustomMappingValues[];
    /** The entry being edited, or `null` while a new one is composed. */
    index: number | null;
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
    // The raw text, not `draft.examples`: a trailing newline an admin is in the
    // middle of typing has to survive a re-render, and splitting on every
    // keystroke would swallow it.
    const [examplesText, setExamplesText] = useState(() =>
        initialValue.examples.join("\n"),
    );
    const [lines, setLines] = useState<CustomMappingTestLine[] | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const update = <TKey extends keyof CustomMappingValues>(
        key: TKey,
        value: CustomMappingValues[TKey],
    ) => setDraft((current) => ({...current, [key]: value}));

    const examples = splitExamples(examplesText);
    const missing = {
        affectedValue: isBlank(draft.affectedValue),
        from: isBlank(draft.from),
        to: isBlank(draft.to),
    };
    const invalid = missing.affectedValue || missing.from || missing.to;

    // The list as it would be after this transaction commits, and the position
    // of the mapping being edited within it. A new mapping is appended, which
    // is where the section's own commit puts it -- so the index sent is always
    // inside the list and `thisMapping` is always answered.
    const edited = {...draft, examples};
    const editedList =
        index === null
            ? [...entries, edited]
            : entries.map((entry, entryIndex) =>
                  entryIndex === index ? edited : entry,
              );
    const editedIndex = index ?? entries.length;

    const submit = () => {
        setSubmitted(true);
        if (invalid) {
            return;
        }
        onSubmit({...draft, examples});
    };

    const runTest = async () => {
        // Both guards answer without a request. Legacy has the first one
        // (`formly-config.js:362-366`); the second exists because "null" is
        // not a useful answer to give an admin who has only just opened a
        // blank dialog, even though FM-194 made the endpoint report it per
        // line instead of answering HTTP 500.
        setLines(null);
        if (examples.length === 0) {
            setFailure(EMPTY_EXAMPLE_INPUT_RESULT);
            return;
        }
        if (isBlank(draft.from)) {
            setFailure(EMPTY_INPUT_PATTERN_RESULT);
            return;
        }
        setFailure(null);
        setTesting(true);
        try {
            const result = await testCustomMappings(transport, {
                examples,
                mappingIndex: editedIndex,
                mappings: editedList,
            });
            if (result.kind === "results") {
                setLines(result.lines);
            } else {
                setFailure(result.message);
            }
        } catch {
            setFailure(REQUEST_FAILED_RESULT);
        } finally {
            setTesting(false);
        }
    };

    return (
        <Dialog
            data-testid={MAPPING_DIALOG_TEST_ID}
            fullWidth
            // FM-195: the result table needs the room -- four columns, one of
            // which holds a whole rewritten title.
            maxWidth="md"
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
                        helperText="Optional. Shown instead of the mapping's position wherever it is named."
                        label="Name"
                        onChange={(event) =>
                            update(
                                "name",
                                event.target.value === ""
                                    ? null
                                    : event.target.value,
                            )
                        }
                        slotProps={{
                            htmlInput: {
                                "data-testid": "config-custom-mapping-name",
                            },
                        }}
                        value={draft.name ?? ""}
                    />
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
                        <Stack
                            direction={{xs: "column", sm: "row"}}
                            spacing={{sm: 3}}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={draft.matchAll}
                                        data-testid="config-custom-mapping-matchAll"
                                        onChange={(event) =>
                                            update(
                                                "matchAll",
                                                event.target.checked,
                                            )
                                        }
                                    />
                                }
                                label="Match whole string"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={draft.enabled}
                                        data-testid="config-custom-mapping-enabled"
                                        onChange={(event) =>
                                            update(
                                                "enabled",
                                                event.target.checked,
                                            )
                                        }
                                    />
                                }
                                label="Enabled"
                            />
                        </Stack>
                        <Typography component="p" variant="body2">
                            If true then the input pattern must match the whole
                            affected value. If false then any match will be
                            replaced, even if it&apos;s only part of the
                            affected value. A disabled mapping is kept but never
                            applied to a search.
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
                        helperText="One example query or title per line. Saved with the mapping, so the examples it was written for stay with it."
                        label="Example queries/titles"
                        minRows={3}
                        multiline
                        onChange={(event) =>
                            setExamplesText(event.target.value)
                        }
                        slotProps={{
                            htmlInput: {
                                "data-testid": "config-custom-mapping-examples",
                            },
                        }}
                        value={examplesText}
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
                    {failure === null ? null : (
                        <Alert
                            data-testid="config-custom-mapping-error"
                            severity="error"
                        >
                            {failure}
                        </Alert>
                    )}
                    {lines === null ? null : (
                        <ResultTable
                            entries={editedList}
                            lines={lines}
                            thisIndex={editedIndex}
                        />
                    )}
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

/**
 * FM-194's per-line answer, one row per example: what this mapping alone does,
 * what the whole list does, and which mappings the list actually applied.
 *
 * The applied column names mappings the way the section's legends do, so a
 * chain answer can be read against the list behind the dialog. It names them
 * from the *edited* list, which is the list the server was sent.
 */
function ResultTable({
    entries,
    lines,
    thisIndex,
}: {
    entries: readonly CustomMappingValues[];
    lines: readonly CustomMappingTestLine[];
    thisIndex: number;
}) {
    return (
        <Box sx={{overflowX: "auto"}}>
            <Table data-testid={RESULTS_TEST_ID} size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Example</TableCell>
                        <TableCell>
                            {customMappingLegend(
                                entries[thisIndex]?.name ?? null,
                                thisIndex,
                            )}
                        </TableCell>
                        <TableCell>All mappings</TableCell>
                        <TableCell>Applied</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {lines.map((line, lineIndex) => (
                        <TableRow
                            data-testid={resultRowTestId(lineIndex)}
                            key={lineIndex}
                        >
                            <TableCell>{line.input}</TableCell>
                            <TableCell>
                                <OutcomeText outcome={line.thisMapping} />
                            </TableCell>
                            <TableCell>
                                <ChainText outcome={line.chain} />
                            </TableCell>
                            <TableCell>
                                {appliedText(entries, line.chain)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

function OutcomeText({outcome}: {outcome: CustomMappingOutcome | null}) {
    if (outcome === null) {
        return (
            <Typography variant="body2">{NO_SINGLE_ANSWER_RESULT}</Typography>
        );
    }
    if (outcome.kind === "error") {
        return (
            <Typography color="error" variant="body2">
                {outcome.message}
            </Typography>
        );
    }
    return (
        <Typography variant="body2">
            {outcome.kind === "match" ? outcome.output : NO_MATCH_RESULT}
        </Typography>
    );
}

function ChainText({outcome}: {outcome: CustomMappingChainOutcome}) {
    return outcome.kind === "error" ? (
        <Typography color="error" variant="body2">
            {outcome.message}
        </Typography>
    ) : (
        <Typography variant="body2">{outcome.output}</Typography>
    );
}

/**
 * The names of the mappings the chain applied, in the order it applied them.
 *
 * FM-194 leaves one nuance here (its review's minor findings): an index can
 * appear whose match an earlier mapping had already consumed, so this reads as
 * "the list considered these", not "each of these changed the line". The
 * column is deliberately named "Applied" rather than "Changed" for that
 * reason. An index outside the list is shown as a bare position rather than
 * dropped, so a disagreement between the two is visible instead of hidden.
 */
function appliedText(
    entries: readonly CustomMappingValues[],
    outcome: CustomMappingChainOutcome,
): string {
    if (outcome.kind === "error" || outcome.appliedIndices.length === 0) {
        return outcome.kind === "error" ? "" : NO_MAPPING_APPLIED;
    }
    return outcome.appliedIndices
        .map((index) =>
            customMappingLegend(entries[index]?.name ?? null, index),
        )
        .join(", ");
}

/**
 * The example field's text as lines. Blank lines are dropped -- an admin
 * separating groups of examples with an empty line is not asking for an empty
 * query to be tested, and the backend would happily answer for one.
 */
function splitExamples(text: string): string[] {
    return text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
}

function isBlank(value: string | null): boolean {
    return value === null || value.trim() === "";
}
