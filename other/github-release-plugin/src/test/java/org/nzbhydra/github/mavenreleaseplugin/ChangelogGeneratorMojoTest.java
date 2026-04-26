package org.nzbhydra.github.mavenreleaseplugin;

import org.apache.maven.plugin.testing.AbstractMojoTestCase;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;


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

    public void testGetMarkdownLinesFromEntrySupportsMultilineText() throws Exception {
        ChangelogVersionEntry entry = new ChangelogVersionEntry(
                "v1.0.0",
                "2019-11-15",
                true,
                Arrays.asList(new ChangelogChangeEntry("note", "First line\nSecond line"))
        );

        java.util.List<String> lines = ChangelogGeneratorMojo.getMarkdownLinesFromEntry(entry);

        assertEquals("**Note** First line<br>\nSecond line", lines.get(1));
    }

    public void testGetMarkdownLinesFromEntrySupportsEscapedNewlineText() throws Exception {
        ChangelogVersionEntry entry = new ChangelogVersionEntry(
                "v1.0.0",
                "2019-11-15",
                true,
                Arrays.asList(new ChangelogChangeEntry("note", "First line\\nSecond line"))
        );

        java.util.List<String> lines = ChangelogGeneratorMojo.getMarkdownLinesFromEntry(entry);

        assertEquals("**Note** First line<br>\nSecond line", lines.get(1));
    }


}
