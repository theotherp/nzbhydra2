/**
 * `C-CONFIG-FIELDS` / `C-SECRET-INPUT`: the configuration area's typed field
 * vocabulary (ADR-0002). Every tab body imports its controls from here, so a
 * new control kind is added once, for its first consumer, and every later tab
 * gets it unchanged.
 */
export {ApiKeySetting} from "./ApiKeySetting";
export {generateApiKey} from "./apiKey";
export {ChipsSetting} from "./ChipsSetting";
export {ConfigFieldset} from "./ConfigFieldset";
export {FileBrowserSetting} from "./FileBrowserSetting";
export {MultiSelectSetting} from "./MultiSelectSetting";
export {NumberSetting} from "./NumberSetting";
export {SecretInput, UNCHANGED_SECRET_MARKER} from "./SecretInput";
export {SelectSetting, type SettingOption} from "./SelectSetting";
export {SettingRow} from "./SettingRow";
export {SwitchSetting} from "./SwitchSetting";
export {TextSetting} from "./TextSetting";
export {
    minimumValidator,
    patternValidator,
    settingInputTestId,
    settingRowTestId,
    settingTestId,
    type ConfigFieldPath,
    type HelpContent,
    type SettingProps,
    type SettingValidator,
} from "./settings";
