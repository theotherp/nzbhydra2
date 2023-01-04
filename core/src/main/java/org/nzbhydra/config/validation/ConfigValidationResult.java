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

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.BaseConfig;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ConfigValidationResult {
    private boolean ok = true;
    private boolean restartNeeded;
    private List<String> errorMessages = new ArrayList<>();
    private List<String> warningMessages = new ArrayList<>();
    private BaseConfig newConfig;

    public ConfigValidationResult(boolean ok, boolean restartNeeded, List<String> errorMessages, List<String> warningMessages) {
        this.ok = ok;
        this.restartNeeded = restartNeeded;
        this.errorMessages.addAll(new HashSet<>(errorMessages));
        this.warningMessages.addAll(new HashSet<>(warningMessages));
    }
}
