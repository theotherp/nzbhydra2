import DeleteIcon from "@mui/icons-material/Delete";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import {FormProvider, useForm} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {useToasts} from "../../../components/toasts/toasts";
import {
    AdvancedDisclosureContext,
    NO_ADVANCED_DISCLOSURE,
} from "../components/advancedDisclosure";
import {CategoryEntryFields} from "./CategoryEntryFields";
import {
    categoryDraftFieldPath,
    categoryEntryLegend,
    CATEGORY_DRAFT_PATH,
    type CategoryValues,
} from "./categoriesSettings";

const CATEGORY_DIALOG_TEST_ID = "config-category-dialog";

/**
 * `F-CONFIG-CATEGORIES`'s category editor (FM-119, ADR-0034), replacing the
 * accordion `CategoriesTable` used to render in place (FM-107). The shape
 * follows `auth/UserDialog.tsx` -- a **transaction**, not a live binding.
 *
 * The dialog creates its own throwaway React Hook Form over a *clone* of the
 * entry and never touches `C-CONFIG-FORM`: typing here cannot reach the
 * configuration, and Cancel and Reset simply discard. Only `onSubmit` --
 * called synchronously from a click handler, with no `await` between it and
 * the click -- hands a finished entry back to `CategoriesTable`, which is
 * what keeps the commit safe against `CategoriesConfig.setCategories`
 * re-sorting the catalog by name on every save: there is no async gap in
 * which the config index this dialog was opened over could go stale.
 *
 * **The required-name guarantee.** Before FM-119, `name` being `required` was
 * enforced by never unmounting a collapsed row's fields, so a blank name still
 * blocked `C-CONFIG-FORM`'s save with its error rendered somewhere in the DOM
 * (`CategoriesTable.tsx`'s former module doc). A modal unmounts those fields,
 * so that mechanism cannot survive -- `submit` below refuses to commit at all
 * unless the draft's own `trigger()` passes first, exactly as
 * `DownloaderDialog.tsx:191-198` already does. That is a strictly better
 * guarantee: the invalid state can never reach the configuration, rather than
 * being created and reported later from a control the admin has to find.
 *
 * **`mayBeSelected`/`preselect`.** Both are part of the persisted shape but
 * have no control anywhere on this dialog (`categoriesSettings.ts`'s
 * `CategoryValues` doc). They are still part of `initialValue`'s clone that
 * seeds the draft form, so react-hook-form already carries them through
 * unregistered (the same mechanism `DownloaderDialog`'s hidden per-type
 * fields rely on) -- `submit` also merges them back from `initialValue`
 * explicitly, so the round-trip does not depend solely on that mechanism
 * (ADR-0003).
 */
export function CategoryDialog({
    initialValue,
    isNew,
    onCancel,
    onDelete,
    onSubmit,
}: {
    initialValue: CategoryValues;
    isNew: boolean;
    onCancel: () => void;
    /** Absent for a new entry, which has nothing to delete yet. */
    onDelete?: () => void;
    onSubmit: (entry: CategoryValues) => void;
}) {
    const toasts = useToasts();
    const draft = useForm<ConfigValues>({
        defaultValues: {
            categoriesConfig: {categoryDraft: structuredClone(initialValue)},
        },
        // No field on this dialog would otherwise unregister -- every one of
        // `CategoryEntryFields`' controls is always rendered -- but this
        // matches the established shape (`DownloaderDialog`, `UserDialog`)
        // and keeps `mayBeSelected`/`preselect`, which have no control at
        // all, from ever being dropped by a future field made conditional.
        shouldUnregister: false,
    });
    const legend = categoryEntryLegend(initialValue);

    const submit = async () => {
        if (!(await draft.trigger())) {
            toasts.showToast({
                message: "Config invalid. Please check your settings.",
                severity: "error",
            });
            return;
        }
        const draftValue = (draft.getValues(CATEGORY_DRAFT_PATH) ??
            {}) as CategoryValues;
        onSubmit({
            ...draftValue,
            mayBeSelected: initialValue.mayBeSelected,
            preselect: initialValue.preselect,
        });
    };

    return (
        // The dialog is portalled to the document body, but React context is
        // not: without this provider the fields below would still be
        // context-descendants of `<ConfigFieldset label="Categories">` and
        // register with it, making that fieldset offer "N advanced settings
        // hidden" behind the modal backdrop for as long as the dialog is
        // open. A dialog is not a fieldset and has no expander of its own, so
        // the right answer is that nobody is counting these rows --
        // `NO_ADVANCED_DISCLOSURE`, the documented "outside any fieldset"
        // value. Only the *hidden* state is affected: with the global toggle
        // on the rows are shown regardless of what any disclosure says.
        <AdvancedDisclosureContext.Provider value={NO_ADVANCED_DISCLOSURE}>
            <Dialog
                data-testid={CATEGORY_DIALOG_TEST_ID}
                fullWidth
                maxWidth="sm"
                onClose={onCancel}
                open
            >
                <DialogTitle>
                    {isNew ? "Add new category" : `Edit ${legend}`}
                </DialogTitle>
                <DialogContent dividers>
                    <FormProvider {...draft}>
                        <CategoryEntryFields pathFor={categoryDraftFieldPath} />
                    </FormProvider>
                </DialogContent>
                <DialogActions>
                    {onDelete === undefined ? null : (
                        <Button
                            color="error"
                            data-testid="config-category-dialog-delete"
                            onClick={onDelete}
                            startIcon={<DeleteIcon />}
                            sx={{mr: "auto"}}
                            type="button"
                        >
                            Delete
                        </Button>
                    )}
                    <Button
                        data-testid="config-category-dialog-cancel"
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid="config-category-dialog-reset"
                        onClick={() => draft.reset()}
                        type="button"
                    >
                        Reset
                    </Button>
                    <Button
                        data-testid="config-category-dialog-submit"
                        onClick={() => void submit()}
                        type="button"
                        variant="contained"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </AdvancedDisclosureContext.Provider>
    );
}
