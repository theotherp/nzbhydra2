package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;

public class ChangelogGeneratorMojoTest extends AbstractMojoTestCase {

    public void testExecute() throws Exception {

        File pom = getTestFile("/src/test/resources/org/nzbhydra/github/mavenreleaseplugin/changelogGeneratorPom.xml");
        assertTrue(pom.exists());
        ChangelogGeneratorMojo generatorMojo = new ChangelogGeneratorMojo();
        generatorMojo = (ChangelogGeneratorMojo) configureMojo(generatorMojo, extractPluginConfiguration("github-release-plugin", pom
        ));

        generatorMojo.execute();
    }


}