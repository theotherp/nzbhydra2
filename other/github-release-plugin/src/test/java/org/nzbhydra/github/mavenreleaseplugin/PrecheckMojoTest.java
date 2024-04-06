package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.commons.io.IOUtils;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class PrecheckMojoTest extends AbstractMojoTestCase {


    public void testFailsOnMissingEntry() throws Exception {

        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomWithChangelogWrongLatestEntry.xml");
        assertTrue(pom.exists());
        PrecheckMojo precheckMojo = new PrecheckMojo();
        precheckMojo = (PrecheckMojo) configureMojo(precheckMojo, extractPluginConfiguration("github-release-plugin", pom
        ));

        try {
            precheckMojo.execute();
            fail("Should've failed");
        } catch (MojoExecutionException e) {
            //
        }
    }

    public void testThatExecutableTimesAreChecked() throws Exception {
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/pomPrecheck.xml");
        assertTrue(pom.exists());
        PrecheckMojo precheckMojo = new PrecheckMojo();
        precheckMojo = (PrecheckMojo) configureMojo(precheckMojo, extractPluginConfiguration("github-release-plugin", pom
        ));

        precheckMojo.py3 = getTempFile().toFile();
        IOUtils.write("py3", new FileWriter(precheckMojo.py3));
        Thread.sleep(10);

        precheckMojo.goWrapper = getTempFile().toFile();
        IOUtils.write("goWrapper", new FileWriter(precheckMojo.goWrapper));
        Thread.sleep(10);

        precheckMojo.windowsExecutable = getTempFile().toFile();
        IOUtils.write("windowsExecutable", new FileWriter(precheckMojo.windowsExecutable));
        Thread.sleep(10);

        precheckMojo.windowsConsoleExecutable = getTempFile().toFile();
        IOUtils.write("windowsConsoleExecutable", new FileWriter(precheckMojo.windowsConsoleExecutable));

        precheckMojo.execute();

        precheckMojo.goWrapper = getTempFile().toFile();
        IOUtils.write("goWrapper", new FileWriter(precheckMojo.goWrapper));

        try {
            precheckMojo.execute();
            fail("Expected exception because goWrapper was changed after executables");
        } catch (MojoExecutionException e) {
            //
        }
    }

    private static Path getTempFile() throws IOException {
        Path tempFile = Files.createTempFile("hydra", "executable");
        tempFile.toFile().deleteOnExit();
        return tempFile;
    }


}
