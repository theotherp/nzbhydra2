import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {
    ChipsSetting,
    ConfigFieldset,
    FileBrowserSetting,
    HelpBlock,
    NumberSetting,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {indexedSetting} from "../settingsSearch/settingsIndex";
import {NotificationEntriesSection} from "./NotificationEntriesSection";
import {
    APPRISE_TYPE_OPTIONS,
    NOTIFICATIONS_HELP_LINES,
} from "./notificationsSettings";

/**
 * `F-CONFIG-NOTIFICATIONS`: the Notifications configuration tab -- every field
 * of `config-fields-service.js:2376-2545`, in legacy's order, bound to
 * `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary.
 *
 * Legacy's `hideExpression`s become plain conditional rendering driven by
 * `useWatch`, as on the Main and Auth tabs: the shell's form is created with
 * `shouldUnregister: false`, so a hidden Apprise URL or filter list keeps its
 * value and is written back unchanged on the next save.
 *
 * The entries list is not the generic add-a-blank-row section: an entry is
 * created *from an event type* and seeded with that event's own templates
 * (`notificationEvents.ts`), and since FM-106 each entry is an accordion with
 * its own template editor. `NotificationEntriesSection` owns all of that.
 */
export function NotificationsConfigTab({transport}: {transport: ApiTransport}) {
    const appriseType = useWatch<ConfigValues>({
        name: "notificationConfig.appriseType",
    });
    const displayNotifications = useWatch<ConfigValues>({
        name: "notificationConfig.displayNotifications",
    });

    return (
        <Box data-testid="config-notifications">
            <HelpBlock
                lines={NOTIFICATIONS_HELP_LINES}
                testId="config-notifications-help"
            />
            <ConfigFieldset label="Main">
                <SelectSetting
                    {...indexedSetting("notificationConfig.appriseType")}
                    options={APPRISE_TYPE_OPTIONS}
                />
                {appriseType === "API" ? (
                    <TextSetting
                        {...indexedSetting("notificationConfig.appriseApiUrl")}
                    />
                ) : null}
                {appriseType === "CLI" ? (
                    <FileBrowserSetting
                        {...indexedSetting("notificationConfig.appriseCliPath")}
                        mode="file"
                        transport={transport}
                    />
                ) : null}
                <SwitchSetting
                    {...indexedSetting(
                        "notificationConfig.displayNotifications",
                    )}
                />
                {displayNotifications === true ? (
                    <NumberSetting
                        {...indexedSetting(
                            "notificationConfig.displayNotificationsMax",
                        )}
                    />
                ) : null}
                <NumberSetting
                    {...indexedSetting(
                        "notificationConfig.indexerHitLimitWarningThreshold",
                    )}
                />
                <NumberSetting
                    {...indexedSetting(
                        "notificationConfig.indexerDownloadLimitWarningThreshold",
                    )}
                />
                {displayNotifications === true ? (
                    <ChipsSetting
                        {...indexedSetting("notificationConfig.filterOuts")}
                    />
                ) : null}
            </ConfigFieldset>
            <ConfigFieldset label="Notifications">
                <NotificationEntriesSection transport={transport} />
            </ConfigFieldset>
        </Box>
    );
}
