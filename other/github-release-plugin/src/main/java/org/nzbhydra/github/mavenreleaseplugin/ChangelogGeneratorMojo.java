package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.base.Joiner;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.codehaus.plexus.util.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;


@SuppressWarnings("unchecked")
@Mojo(name = "generate-changelog",
        inheritByDefault = false,
        aggregator = true //Only call for parent POM
)
public class ChangelogGeneratorMojo extends AbstractMojo {

    @Parameter(property = "changelogJsonFile", required = true)
    protected File changelogJsonFile;

    @Parameter(property = "changelogMdFile", required = true)
    protected File changelogMdFile;

    private ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute() throws MojoExecutionException {

        if (!changelogJsonFile.exists()) {
            throw new MojoExecutionException("JSON file does not exist: " + changelogJsonFile.getAbsolutePath());
        }
        getLog().info("Will write from " + changelogJsonFile.getAbsolutePath() + " to " + changelogMdFile.getAbsolutePath());


        List<ChangelogVersionEntry> entries;
        try {
            entries = objectMapper.readValue(Files.readAllBytes(changelogJsonFile.toPath()), new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to read JSON file", e);
        }
        Collections.sort(entries);
        Collections.reverse(entries);
        List<String> lines = new ArrayList<>();
        for (ChangelogVersionEntry entry : entries) {
            lines.add("###" + entry.getVersion());
            for (ChangelogChangeEntry changeEntry : entry.getChanges()) {
                lines.add(StringUtils.capitalise(changeEntry.getType()) + ": " + changeEntry.getText());
            }
            lines.add("");
        }
        try {
            Files.write(changelogMdFile.toPath(), Joiner.on("\n").join(lines).getBytes());
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to write lines to MD file " + changelogMdFile.getAbsolutePath(), e);
        }


    }


}
