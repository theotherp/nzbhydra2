/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.config.spring;

import org.springframework.beans.factory.config.CustomEditorConfigurer;
import org.springframework.beans.propertyeditors.StringTrimmerEditor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.Nullable;

import java.beans.PropertyEditor;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class EmptyStringAsNullConfiguration {

    @Bean
    public static CustomEditorConfigurer propertyEditorRegistrySupport() {
        CustomEditorConfigurer customEditorConfigurer = new CustomEditorConfigurer();

        Map<Class<?>, Class<? extends PropertyEditor>> map = new HashMap<>();
        map.put(String.class, EmptyStringAsNullEditor.class);
        customEditorConfigurer.setCustomEditors(map);
        return customEditorConfigurer;
    }

    public static class EmptyStringAsNullEditor extends StringTrimmerEditor {
        public EmptyStringAsNullEditor(boolean emptyAsNull) {
            super(true);
        }
        public EmptyStringAsNullEditor() {
            super(true);
        }

        @Override
        public void setAsText(@Nullable String text) {
            if ("".equals(text)) {
                super.setValue(null);
            } else {
                super.setValue(text);
            }
        }
    }


}
