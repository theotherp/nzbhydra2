import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import {FormProvider, useForm, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    SecretInput,
    SwitchSetting,
    TextSetting,
    textValue,
} from "../components";
import {focusFirstInvalidField} from "../invalidFieldFocus";
import {
    userDraftFieldPath,
    userLegend,
    USER_DRAFT_PATH,
    type UserAuthConfigValues,
} from "./authSettings";

const USER_DIALOG_TEST_ID = "config-user-dialog";

/**
 * `F-CONFIG-AUTH`'s user editor (FM-105): the fields legacy's `users` repeat
 * section rendered inline, moved into a modal **transaction** of exactly the
 * shape `DownloaderDialog` established -- minus its connection check, which a
 * user has nothing to test against.
 *
 * The transaction is the point, and with credentials it is more than a
 * convenience. The dialog builds its own throwaway React Hook Form over a
 * *clone* of the entry and never touches `C-CONFIG-FORM`: typing here cannot
 * reach the configuration, Cancel simply discards, and only `onSubmit` hands a
 * finished entry back to the section that owns the array. A half-filled new
 * user therefore never sits invalid inside the whole-config form, and no
 * keystroke can write a `***UNCHANGED***` marker -- or an empty string over a
 * stored hash -- into a user the admin never confirmed.
 *
 * **The masked password.** The clone carries the stored password exactly as it
 * arrived, which for a saved user is the server's marker. That is what
 * `SecretInput`'s contract needs: handed the marker it shows an empty field
 * with an "unchanged" placeholder and restores the marker if the admin clears
 * what they typed. Seeding the field empty instead would look identical on
 * screen and save an empty password over the stored hash on submit.
 */
export function UserDialog({
    authType,
    existingUsernames,
    initialValue,
    isNew,
    onCancel,
    onSubmit,
}: {
    /**
     * `auth.authType` read from the *configuration*, and passed in rather than
     * watched here: inside the dialog the nearest form is the draft, which
     * holds only the user being edited. It is the tab's own value, and the tab
     * unmounts this dialog with it.
     */
    authType: unknown;
    /** The usernames of the *other* configured users (see `uniqueUsername`). */
    existingUsernames: readonly string[];
    initialValue: UserAuthConfigValues;
    /** A new entry has no stored counterpart, which only changes the title. */
    isNew: boolean;
    onCancel: () => void;
    onSubmit: (entry: UserAuthConfigValues) => void;
}) {
    const draft = useForm<ConfigValues>({
        defaultValues: {auth: {userDraft: structuredClone(initialValue)}},
        // The password field is not rendered for OIDC, and the three dependent
        // rights switches are hidden while `maySeeAdmin` is on. Neither may
        // drop the value it arrived with from the committed entry.
        shouldUnregister: false,
    });

    return (
        <Dialog
            data-testid={USER_DIALOG_TEST_ID}
            fullWidth
            maxWidth="sm"
            onClose={onCancel}
            open
        >
            <DialogTitle>
                {isNew ? "Add new user" : `Edit ${userLegend(initialValue)}`}
            </DialogTitle>
            <DialogContent dividers>
                <FormProvider {...draft}>
                    <UserDialogFields
                        authType={authType}
                        existingUsernames={existingUsernames}
                    />
                </FormProvider>
            </DialogContent>
            <DialogActions>
                <Button
                    data-testid="config-user-dialog-cancel"
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </Button>
                <Button
                    data-testid="config-user-dialog-submit"
                    onClick={() => {
                        void (async () => {
                            if (!(await draft.trigger())) {
                                // This dialog does not even growl, so without
                                // this the Save button is simply inert. The
                                // caret on the offending field is the whole
                                // report.
                                focusFirstInvalidField(draft.control);
                                return;
                            }
                            onSubmit(
                                (draft.getValues(USER_DRAFT_PATH) ??
                                    {}) as UserAuthConfigValues,
                            );
                        })();
                    }}
                    type="button"
                    variant="contained"
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/**
 * The fields, inside the draft `FormProvider` so `useWatch` reads the *draft*
 * rather than the configuration behind the dialog. Both branches are the ones
 * the inline section already had: OIDC has no password (the provider
 * authenticates, the local entry only carries permissions), and `maySeeAdmin`
 * implies the other three and hides them.
 */
function UserDialogFields({
    authType,
    existingUsernames,
}: {
    authType: unknown;
    existingUsernames: readonly string[];
}) {
    const maySeeAdmin =
        useWatch<ConfigValues>({name: userDraftFieldPath("maySeeAdmin")}) ===
        true;

    /**
     * A username is what the backend matches a submitted user back to its
     * stored record by (`UserAuthConfigValidator.findCorrespondingOldUserConfig`
     * and `SensitiveDataConfigValidator`'s identity pass, both plain
     * `String.equals`). Two entries sharing one exactly means the first stored
     * record answers for both, and one user's `***UNCHANGED***` marker resolves
     * to the other's hash. Usernames that merely differ in case are *distinct*
     * to both matchers and stay legal here.
     */
    const uniqueUsername = (value: unknown) => {
        const username = textValue(value);
        return existingUsernames.includes(username)
            ? `User "${username}" already exists`
            : true;
    };

    return (
        <>
            <TextSetting
                label="Username"
                name={userDraftFieldPath("username")}
                required
                validate={uniqueUsername}
            />
            {authType === "OIDC" ? null : (
                <SecretInput
                    label="Password"
                    name={userDraftFieldPath("password")}
                    required
                />
            )}
            <SwitchSetting
                label="May see admin area"
                name={userDraftFieldPath("maySeeAdmin")}
            />
            {maySeeAdmin ? null : (
                <>
                    <SwitchSetting
                        label="May see stats"
                        name={userDraftFieldPath("maySeeStats")}
                    />
                    <SwitchSetting
                        label="May see NZB details & DL links"
                        name={userDraftFieldPath("maySeeDetailsDl")}
                    />
                    <SwitchSetting
                        label="May see indexer selection box"
                        name={userDraftFieldPath("showIndexerSelection")}
                    />
                </>
            )}
        </>
    );
}
