package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;

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





}