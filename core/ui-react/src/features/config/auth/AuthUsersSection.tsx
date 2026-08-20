import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    RepeatSection,
    SecretInput,
    SwitchSetting,
    TextSetting,
} from "../components";
import {
    defaultUser,
    userFieldPath,
    type UserAuthConfigValues,
} from "./authSettings";

const AUTHLESS_LEGEND = "Authless";

/**
 * `F-CONFIG-AUTH`'s Users section (legacy's `users` repeat section,
 * `config-fields-service.js:2295-2374`): add, edit, and remove users inline,
 * matching legacy's `repeatSection.html` rather than a modal.
 */
export function AuthUsersSection() {
    return (
        <RepeatSection<UserAuthConfigValues>
            addLabel="Add new user"
            defaultEntry={defaultUser}
            entryLegend={(entry) =>
                entry.username && entry.username.length > 0
                    ? entry.username
                    : AUTHLESS_LEGEND
            }
            name="auth.users"
            renderEntry={(index) => <UserEntryFields index={index} />}
        />
    );
}

function UserEntryFields({index}: {index: number}) {
    const authType = useWatch<ConfigValues>({name: "auth.authType"});
    const maySeeAdmin =
        useWatch<ConfigValues>({
            name: userFieldPath(index, "maySeeAdmin"),
        }) === true;

    return (
        <>
            <TextSetting
                label="Username"
                name={userFieldPath(index, "username")}
                required
            />
            {authType === "OIDC" ? null : (
                <SecretInput
                    label="Password"
                    name={userFieldPath(index, "password")}
                    required
                />
            )}
            <SwitchSetting
                label="May see admin area"
                name={userFieldPath(index, "maySeeAdmin")}
            />
            {maySeeAdmin ? null : (
                <>
                    <SwitchSetting
                        label="May see stats"
                        name={userFieldPath(index, "maySeeStats")}
                    />
                    <SwitchSetting
                        label="May see NZB details & DL links"
                        name={userFieldPath(index, "maySeeDetailsDl")}
                    />
                    <SwitchSetting
                        label="May see indexer selection box"
                        name={userFieldPath(index, "showIndexerSelection")}
                    />
                </>
            )}
        </>
    );
}
