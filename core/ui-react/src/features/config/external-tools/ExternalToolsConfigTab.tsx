import {Box} from "@mui/material";

import {ApiTransport} from "../../../api/transport";
import {ConfigFieldset, SwitchSetting} from "../components";
import {ExternalToolsSection} from "./ExternalToolsSection";

/**
 * `F-CONFIG-EXTERNAL-TOOLS`: the External Tools configuration tab —
 * legacy's `config-fields-service.js:1980-2000` sync switch followed by the
 * `externalToolConfig` field type's own list
 * (`core/ui-src/html/config/external-tool-config.html`), in that order.
 *
 * The switch is an ordinary `C-CONFIG-FIELDS` control bound to the shared
 * whole-config form; the list below it is not, because an external tool is
 * edited as a transaction that writes into another application before it is
 * accepted (see `ExternalToolDialog`).
 */
export function ExternalToolsConfigTab({transport}: {transport: ApiTransport}) {
    return (
        <Box data-testid="config-external-tools">
            <ConfigFieldset label="External Tool Sync Settings">
                <SwitchSetting
                    help="Automatically sync indexers to external tools when configuration is saved"
                    label="Sync on config change"
                    name="externalTools.syncOnConfigChange"
                />
            </ConfigFieldset>
            <ConfigFieldset label="External tools">
                <ExternalToolsSection transport={transport} />
            </ConfigFieldset>
        </Box>
    );
}
