/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.exceptionanalyzers;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;
import org.yaml.snakeyaml.error.YAMLException;

public class YAMLExceptionAnalyzer extends AbstractFailureAnalyzer<YAMLException> {
    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, YAMLException cause) {
        return new FailureAnalysis("The file nzbhydra.yml in the data folder could not be loaded. It might be corrupt", "Delete file to start with an initial config or restore from a backup", cause);
    }
}
