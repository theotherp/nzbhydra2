import {Box, Chip, Paper, Stack, Typography} from "@mui/material";
import {useEffect, useId, useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    settingInputTestId,
    TextAreaSetting,
    TextSetting,
    textValue,
} from "../components";
import type {NotificationEventDefinition} from "./notificationEvents";
import {notificationEntryPath} from "./notificationsSettings";
import {
    insertVariable,
    renderNotificationTemplate,
    variableToken,
} from "./notificationTemplate";

/** The two template fields, and the labels the editor names them by. */
const TEMPLATE_FIELDS = {
    bodyTemplate: "Body template",
    titleTemplate: "Title template",
} as const;

type TemplateField = keyof typeof TEMPLATE_FIELDS;

/**
 * Which field a chip inserts into before the admin has focused either. The body
 * is the required field and the one that carries most of the text, so it is the
 * useful default; the caption states the target either way, so the choice is
 * never something the admin has to infer.
 */
const DEFAULT_TARGET: TemplateField = "bodyTemplate";

/**
 * `F-CONFIG-NOTIFICATIONS`: one entry's title and body templates, plus the two
 * affordances that stop the variable vocabulary from having to be memorized out
 * of the help prose -- a chip per variable that inserts its token at the caret,
 * and a preview rendered with the event's own test-instance sample values.
 *
 * Both are driven by `notificationEvents.ts`' backend-derived `variables` and
 * `sampleValues`, never by `templateHelp`: that prose is legacy text kept with
 * its defects (`RESULT_DOWNLOAD` writes `$title` with no closing `$`), so
 * parsing it would drop a real variable and invent nothing in its place.
 *
 * For an entry whose event type this build does not know there is neither a
 * chip row nor a preview -- there are no variables to offer and no samples to
 * render, and guessing would be worse than saying nothing. The fields
 * themselves stay editable.
 */
export function NotificationTemplateEditor({
    event,
    index,
}: {
    event: NotificationEventDefinition | undefined;
    index: number;
}) {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const containerRef = useRef<HTMLDivElement>(null);
    const [target, setTarget] = useState<TemplateField>(DEFAULT_TARGET);
    /**
     * Where the caret belongs once React has committed the inserted value.
     * Restoring it synchronously would not survive the re-render the `setValue`
     * triggers, so it is applied from an effect -- and a fresh object every
     * time, so inserting the same token twice in the same place still fires.
     */
    const [pendingCaret, setPendingCaret] = useState<{
        caret: number;
        field: TemplateField;
    } | null>(null);
    const captionId = useId();

    const titleTemplate = useWatch<ConfigValues>({
        name: notificationEntryPath(index, "titleTemplate"),
    });
    const bodyTemplate = useWatch<ConfigValues>({
        name: notificationEntryPath(index, "bodyTemplate"),
    });

    useEffect(() => {
        if (pendingCaret === null) {
            return;
        }
        const input = containerRef.current?.querySelector<HTMLTextAreaElement>(
            `[data-testid="${settingInputTestId(notificationEntryPath(index, pendingCaret.field))}"]`,
        );
        input?.focus();
        input?.setSelectionRange(pendingCaret.caret, pendingCaret.caret);
    }, [index, pendingCaret]);

    /**
     * The insert goes through the shared form's `setValue`, not through the
     * input's `value`: writing the DOM directly would leave React Hook Form
     * holding the old string, so the token would vanish on the next render and
     * never reach the save.
     */
    const insert = (name: string) => {
        const path = notificationEntryPath(index, target);
        const input = containerRef.current?.querySelector<HTMLTextAreaElement>(
            `[data-testid="${settingInputTestId(path)}"]`,
        );
        const {caret, value} = insertVariable(
            textValue(getValues(path)),
            name,
            {
                end: input?.selectionEnd ?? null,
                start: input?.selectionStart ?? null,
            },
        );
        setValue(path, value as never, {
            shouldDirty: true,
            shouldValidate: true,
        });
        setPendingCaret({caret, field: target});
    };

    return (
        <Box
            onFocusCapture={(focusEvent) => {
                const focused = (focusEvent.target as HTMLElement).dataset
                    .testid;
                for (const field of Object.keys(
                    TEMPLATE_FIELDS,
                ) as TemplateField[]) {
                    if (
                        focused ===
                        settingInputTestId(notificationEntryPath(index, field))
                    ) {
                        setTarget(field);
                    }
                }
            }}
            ref={containerRef}
        >
            <TextSetting
                help={event?.templateHelp}
                label={TEMPLATE_FIELDS.titleTemplate}
                name={notificationEntryPath(index, "titleTemplate")}
            />
            <TextAreaSetting
                help={event?.templateHelp}
                label={TEMPLATE_FIELDS.bodyTemplate}
                name={notificationEntryPath(index, "bodyTemplate")}
                required
            />
            {event === undefined ? null : (
                <>
                    <Box sx={{mb: 2.5}}>
                        <Typography
                            component="p"
                            gutterBottom
                            id={captionId}
                            variant="body2"
                        >
                            Insert a variable into the {TEMPLATE_FIELDS[target]}{" "}
                            field:
                        </Typography>
                        <Stack
                            direction="row"
                            flexWrap="wrap"
                            spacing={1}
                            useFlexGap
                        >
                            {event.variables.map((name) => (
                                <Chip
                                    aria-describedby={captionId}
                                    clickable
                                    component="button"
                                    data-testid={`config-notification-variable-${index}-${name}`}
                                    key={name}
                                    label={variableToken(name)}
                                    onClick={() => insert(name)}
                                    type="button"
                                    variant="outlined"
                                />
                            ))}
                        </Stack>
                    </Box>
                    <TemplatePreview
                        body={renderNotificationTemplate(
                            textValue(bodyTemplate),
                            event.sampleValues,
                        )}
                        index={index}
                        title={renderNotificationTemplate(
                            textValue(titleTemplate),
                            event.sampleValues,
                        )}
                    />
                </>
            )}
        </Box>
    );
}

/**
 * What a test send of this entry would deliver. The substitution is the
 * server's (`NotificationHandler.fillTemplate`), so a `$token$` the event does
 * not provide stands here exactly as it will stand in the message -- the
 * preview's job is to show the delivered text, including the admin's typos, not
 * a corrected version of it.
 */
function TemplatePreview({
    body,
    index,
    title,
}: {
    body: string;
    index: number;
    title: string;
}) {
    const rows: {label: string; missing: string; value: string}[] = [
        {
            label: "Title",
            // `NotificationHandler` sends a null title for an empty template
            // rather than an empty one.
            missing: "No title template — the notification is sent untitled.",
            value: title,
        },
        {
            label: "Body",
            missing: "No body template — this entry cannot be saved.",
            value: body,
        },
    ];

    return (
        <Box
            data-testid={`config-notification-preview-${index}`}
            sx={{mb: 2.5}}
        >
            <Typography component="h4" gutterBottom variant="subtitle2">
                Preview with this event&apos;s sample values
            </Typography>
            <Paper component="dl" sx={{m: 0, p: 1.5}} variant="outlined">
                {rows.map((row) => (
                    <Stack
                        direction={{sm: "row", xs: "column"}}
                        key={row.label}
                        spacing={{sm: 1}}
                    >
                        <Typography
                            component="dt"
                            sx={{minWidth: (theme) => theme.spacing(8)}}
                            variant="body2"
                        >
                            {row.label}
                        </Typography>
                        <Typography
                            component="dd"
                            data-testid={`config-notification-preview-${index}-${row.label.toLowerCase()}`}
                            sx={{
                                m: 0,
                                overflowWrap: "anywhere",
                                // The body template may contain newlines --
                                // INDEXER_DISABLED's seeded one does -- and the
                                // delivered message keeps them.
                                whiteSpace: "pre-wrap",
                            }}
                            variant="body2"
                        >
                            {row.value === "" ? (
                                <Box component="em">{row.missing}</Box>
                            ) : (
                                row.value
                            )}
                        </Typography>
                    </Stack>
                ))}
            </Paper>
        </Box>
    );
}
