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

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.filefilter.NameFileFilter;
import org.apache.commons.io.filefilter.TrueFileFilter;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.io.File;
import java.util.List;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class StaticResourcesLoadableTest {

    private static final Logger logger = LoggerFactory.getLogger(StaticResourcesLoadableTest.class);

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldLoadAllStaticResources() throws Exception {
        final File coreFolder = DirectoryTreeUpTraversal.walkUpDirectoryTreeUntilFound(new NameFileFilter("core"), new File(""));
        Assertions.assertThat(coreFolder).isNotNull().exists();
        final File resourcesFolder = new File(coreFolder, "src/main/resources");
        final File staticResourcesFolder = new File(resourcesFolder, "static");
        final List<File> files = FileUtils.listFiles(staticResourcesFolder, TrueFileFilter.INSTANCE, TrueFileFilter.INSTANCE)
                .stream().filter(File::isFile).toList();
        for (File file : files) {
            final String resourceUrlPath = resourcesFolder.toPath().relativize(file.toPath()).toString();
            final HydraResponse hydraResponse = hydraClient.get(resourceUrlPath).raiseIfUnsuccessful();
        }
        logger.info("Successfully loaded " + files.size() + " static resource files");
    }


}
