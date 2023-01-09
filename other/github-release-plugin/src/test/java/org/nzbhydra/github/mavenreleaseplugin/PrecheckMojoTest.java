package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.commons.io.IOUtils;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.io.FileWriter;
import java.nio.file.Files;

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

        precheckMojo.py3 = Files.createTempFile("hydra", "executable").toFile();
        IOUtils.write("py3", new FileWriter(precheckMojo.py3));

        precheckMojo.windowsPy = Files.createTempFile("hydra", "executable").toFile();
        IOUtils.write("windowsPy", new FileWriter(precheckMojo.windowsPy));

        precheckMojo.windowsExecutable = Files.createTempFile("hydra", "executable").toFile();
        IOUtils.write("windowsExecutable", new FileWriter(precheckMojo.windowsExecutable));

        precheckMojo.linuxExecutable = Files.createTempFile("hydra", "executable").toFile();
        IOUtils.write("linuxExecutable", new FileWriter(precheckMojo.linuxExecutable));

        precheckMojo.windowsConsoleExecutable = Files.createTempFile("hydra", "executable").toFile();
        IOUtils.write("windowsConsoleExecutable", new FileWriter(precheckMojo.windowsConsoleExecutable));

        precheckMojo.execute();


        precheckMojo.py3 = Files.createTempFile("hydra", "executable").toFile();
        IOUtils.write("py3", new FileWriter(precheckMojo.py3));

        try {
            precheckMojo.execute();
            fail("Expected exception because py3 was changed after executables");
        } catch (MojoExecutionException e) {
            //
        }


    }


}
