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
export {HelpBlock} from "./HelpBlock";
export {MultiSelectSetting} from "./MultiSelectSetting";
export {NumberSetting} from "./NumberSetting";
export {RepeatSection} from "./RepeatSection";
export {SecretInput, UNCHANGED_SECRET_MARKER} from "./SecretInput";
export {SelectSetting, type SettingOption} from "./SelectSetting";
export {SettingRow} from "./SettingRow";
export {SwitchSetting} from "./SwitchSetting";
export {TextAreaSetting} from "./TextAreaSetting";
export {TextSetting} from "./TextSetting";
export {
    maximumValidator,
    minimumValidator,
    patternValidator,
    settingInputTestId,
    settingRowTestId,
    settingTestId,
    textValue,
    type ConfigFieldPath,
    type HelpContent,
    type SettingProps,
    type SettingValidator,
} from "./settings";
