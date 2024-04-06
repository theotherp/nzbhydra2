/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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
    default void initializeNewConfig(T newConfig) {
    }
}
