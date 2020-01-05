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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.LocalDate;
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

        if (entries.get(0).getDate() == null) {
            entries.get(0).setDate(LocalDate.now().toString());
        }
        try {
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(changelogJsonFile, entries);
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to update json file " + changelogJsonFile.getAbsolutePath(), e);
        }

        List<String> lines = new ArrayList<>();
        for (ChangelogVersionEntry entry : entries) {
            lines.addAll(getMarkdownLinesFromEntry(entry));
        }

        try {
            Files.write(changelogMdFile.toPath(), Joiner.on("\n\n").join(lines).getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to write lines to MD file " + changelogMdFile.getAbsolutePath(), e);
        }

    }

    static List<String> getMarkdownLinesFromEntry(ChangelogVersionEntry entry) {
        List<String> lines = new ArrayList<>();
        String versionLine = "### " + entry.getVersion();
        if (!entry.isFinal()) {
            versionLine += " BETA";
        }
        if (entry.getDate() != null) {
            versionLine += " (" + entry.getDate() + ")";
        }
        lines.add(versionLine);
        for (ChangelogChangeEntry changeEntry : entry.getChanges()) {
            lines.add("**" + StringUtils.capitalise(changeEntry.getType()) + "** " + changeEntry.getText());
        }
        lines.add("");
        return lines;
    }


}
