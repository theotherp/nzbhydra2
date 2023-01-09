package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;


public class PublishOnDiscordMojoTest extends AbstractMojoTestCase {

    public void setUp() throws Exception {
        super.setUp();
        Files.copy(getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.json.orig").toPath(), getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelog.json").toPath(), StandardCopyOption.REPLACE_EXISTING);
    }

    public void testExecute() throws Exception {
        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/discordPublisherPom.xml");
        assertTrue(pom.exists());
        PublishOnDiscordMojo generatorMojo = new PublishOnDiscordMojo();
        generatorMojo = (PublishOnDiscordMojo) configureMojo(generatorMojo, extractPluginConfiguration("github-release-plugin", pom
        ));

        generatorMojo.execute();
    }


}
