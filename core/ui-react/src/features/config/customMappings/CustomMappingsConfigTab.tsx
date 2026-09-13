import {Box, Stack, Typography} from "@mui/material";

import {ApiTransport} from "../../../api/transport";
import {CustomMappingsSection} from "./CustomMappingsSection";
import {
    CUSTOM_MAPPINGS_HEADLINE,
    CUSTOM_MAPPINGS_TOOLTIP,
} from "./customMappingSettings";

/**
 * `F-CONFIG-SEARCHING`'s custom mappings, as their own configuration tab
 * (`/config/customMappings`) since FM-195 — the React half of issue #902.
 *
 * The list is **not** behind an advanced disclosure here, although FM-131 put
 * it behind one on Searching. That gate was about position, not about who the
 * setting is for: the section sat at the foot of a tab full of other
 * fieldsets, so hiding it with the global toggle off kept that tab short. A
 * whole tab hidden the same way could not be reached at all — the nav entry
 * would still be there and the body would be empty — so the tab renders its
 * one section directly.
 *
 * It also renders no `ConfigFieldset`. A fieldset's purpose is to separate one
 * group of settings from the next within a tab, and this tab is a single list;
 * `settingsIndex.ts`'s entry for it accordingly carries no `fieldset`, which
 * is what makes `C-CONFIG-REVIEW` attribute a changed mapping to "Custom
 * Mappings" rather than to a group inside it.
 *
 * The stored path is unchanged: mappings still live at
 * `searching.customMappings` and are still saved by the same whole-config PUT
 * from the same shared form (`ConfigShell` keeps that form mounted across tab
 * switches), so this is a grouping of the UI and nothing else.
 */
export function CustomMappingsConfigTab({
    transport,
}: {
    transport: ApiTransport;
}) {
    return (
        <Box data-testid="config-custom-mappings">
            <Stack spacing={1} sx={{mb: 3}}>
                <Typography component="h2" variant="h6">
                    {CUSTOM_MAPPINGS_HEADLINE}
                </Typography>
                <Typography
                    component="p"
                    sx={{color: "text.secondary"}}
                    variant="body2"
                >
                    {CUSTOM_MAPPINGS_TOOLTIP}
                </Typography>
            </Stack>
            <CustomMappingsSection transport={transport} />
        </Box>
    );
}
