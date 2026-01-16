

package org.nzbhydra.config.validation;

import org.nzbhydra.config.BaseConfig;

public interface ConfigValidator<T> {

    boolean doesValidate(Class<?> clazz);

    /**
     * @param oldBaseConfig old config state (e.g. to compare what has changed)
     * @param newBaseConfig
     * @param newConfig     the new config. Will always be the same object as the one on which the method was called
     * @return a list of error messages or an empty list when everything is fine
     */
    ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, T newConfig);

    /**
     * Called before the config is saved after the user made some changes. Use this to convert data, e.g. passwords.
     *
     * @param oldBaseConfig
     */
    default T prepareForSaving(BaseConfig oldBaseConfig, T newConfig) {
        return newConfig;
    }

    /**
     * Called before the config is transferred to the GUI. Use this to prepare data, e.g. passwords.
     */
    default T updateAfterLoading(T newConfig) {
        return newConfig;
    }

    /**
     * Called for a new config to initialize itself
     */
    default T initializeNewConfig(T newConfig) {
        return newConfig;
    }
}
