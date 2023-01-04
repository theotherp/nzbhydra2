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

package org.nzbhydra;

import org.javers.core.json.JsonConverterBuilder;
import org.nzbhydra.backup.BackupData;
import org.nzbhydra.downloading.downloaders.sabnzbd.mapping.QueueResponse;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.news.NewsWeb;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;

public class NativeHints implements RuntimeHintsRegistrar {


    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        hints.reflection().registerType(NewsWeb.NewsEntryForWeb.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS);
        hints.reflection().registerType(BackupData.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS);
        hints.reflection().registerType(NewznabParameters.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS);
        hints.reflection().registerType(QueueResponse.class, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS);
        hints.resources().registerResourceBundle("joptsimple.ExceptionMessages");
    }

}
