package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;


public class ChangelogGeneratorMojoTest extends AbstractMojoTestCase {

    public void setUp() throws Exception {
        super.setUp();
        Files.copy(getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.yaml.orig").toPath(), getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.yaml").toPath(), StandardCopyOption.REPLACE_EXISTING);
    }

    public void testExecute() throws Exception {
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelogGeneratorPom.xml");
        assertTrue(pom.exists());
        ChangelogGeneratorMojo generatorMojo = new ChangelogGeneratorMojo();
        generatorMojo = (ChangelogGeneratorMojo) configureMojo(generatorMojo, extractPluginConfiguration("github-release-plugin", pom
        ));

        generatorMojo.execute();
    }


}
