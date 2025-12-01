package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.google.common.base.Joiner;
import com.google.common.collect.Sets;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;
import org.codehaus.plexus.util.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;


@SuppressWarnings("unchecked")
@Mojo(name = "generate-changelog",
    inheritByDefault = false,
    aggregator = true //Only call for parent POM
)
public class ChangelogGeneratorMojo extends AbstractMojo {

    public static final HashSet<String> ALLOWED_CHANGE_TYPES = Sets.newHashSet("fix", "feature", "note");
    @Parameter(property = "changelogYamlFile", required = true)
    protected File changelogYamlFile;

    @Parameter(property = "changelogMdFile", required = true)
    protected File changelogMdFile;

    private final ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());

    @Override
    public void execute() throws MojoExecutionException {
        if (!changelogYamlFile.exists()) {
            throw new MojoExecutionException("JSON file does not exist: " + changelogYamlFile.getAbsolutePath());
        }
        getLog().info("Will write from " + changelogYamlFile.getAbsolutePath() + " to " + changelogMdFile.getAbsolutePath());


        List<ChangelogVersionEntry> entries;
        try {
            entries = objectMapper.readValue(Files.readAllBytes(changelogYamlFile.toPath()), new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to read JSON file", e);
        }
        Collections.sort(entries);
        Collections.reverse(entries);

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

    static List<String> getMarkdownLinesFromEntry(ChangelogVersionEntry entry) throws MojoExecutionException {
        List<String> lines = new ArrayList<>();
        String versionLine = "### " + entry.getVersion();
        if (!entry.isFinal()) {
            versionLine += " BETA";
        }
        if (entry.getDate() == null) {
            throw new MojoExecutionException("No date set for " + entry);
        }
        if (entry.getChanges().stream().anyMatch(x -> !ALLOWED_CHANGE_TYPES.contains(x.getType()))) {
            throw new MojoExecutionException("Change type must be any of " + ALLOWED_CHANGE_TYPES);
        }
        versionLine += " (" + entry.getDate() + ")";
        lines.add(versionLine);

        for (ChangelogChangeEntry changeEntry : entry.getChanges()) {
            final String text = changeEntry.getText()
                    .replaceAll("#(\\d{3,})", "<a href=\"https://github.com/theotherp/nzbhydra2/issues/$1\">#$1</a>");
            lines.add("**" + StringUtils.capitalise(changeEntry.getType()) + "** " + text);
        }
        lines.add("");
        return lines;
    }


}
