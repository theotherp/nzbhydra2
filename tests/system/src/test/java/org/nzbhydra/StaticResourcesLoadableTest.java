

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
            final HydraResponse hydraResponse = hydraClient.get(resourceUrlPath);
        }
        logger.info("Successfully loaded " + files.size() + " static resource files");
    }


}
