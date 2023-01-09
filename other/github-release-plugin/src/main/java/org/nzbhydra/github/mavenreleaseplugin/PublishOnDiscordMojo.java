package org.nzbhydra.github.mavenreleaseplugin;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.channel.concrete.TextChannel;
import org.apache.maven.plugin.AbstractMojo;
import org.apache.maven.plugin.MojoExecutionException;
import org.apache.maven.plugins.annotations.Mojo;
import org.apache.maven.plugins.annotations.Parameter;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;


@SuppressWarnings("unchecked")
@Mojo(name = "publish-on-discord",
    inheritByDefault = false,
    aggregator = true //Only call for parent POM
)
public class PublishOnDiscordMojo extends AbstractMojo {

    private static final String TEMPLATE = "%s\n" +
                                           "\n" +
                                           "Link: https://github.com/theotherp/nzbhydra2/releases/tag/%s\n";

    @Parameter(property = "changelogJsonFile", required = true)
    protected File changelogJsonFile;

    @Parameter(property = "tagName", required = true)
    protected String tagName;
    @Parameter(property = "discordToken", required = true)
    protected String discordToken;

    @Parameter(property = "dryRun")
    protected boolean dryRun;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void execute() throws MojoExecutionException {

        if (!changelogJsonFile.exists()) {
            throw new MojoExecutionException("JSON file does not exist: " + changelogJsonFile.getAbsolutePath());
        }

        List<ChangelogVersionEntry> entries;
        try {
            entries = objectMapper.readValue(Files.readAllBytes(changelogJsonFile.toPath()), new TypeReference<List<ChangelogVersionEntry>>() {
            });
        } catch (IOException e) {
            throw new MojoExecutionException("Unable to read JSON file", e);
        }
        Collections.sort(entries);
        Collections.reverse(entries);

        final ChangelogVersionEntry entry = entries.get(0);
        final String joined = String.join("\n", ChangelogGeneratorMojo.getMarkdownLinesFromEntry(entry));
        final String message = String.format(TEMPLATE, joined, tagName)
            .replaceAll("### (.*)\n", "**$1**\n");

        getLog().info("Sending message to release channel(s):\n" + message);
        if (dryRun) {
            getLog().info("Not sending message because of dry run");
            return;
        }
        try {
            JDA jda = JDABuilder.createDefault(discordToken).build().awaitReady();
            final List<TextChannel> channels = jda.getTextChannels().stream().filter(x -> x.getName().equals("releases")).collect(Collectors.toList());
            for (TextChannel channel : channels) {
                channel.sendMessage(message).queue();
            }
            jda.shutdown();
        } catch (Exception e) {
            throw new MojoExecutionException(e);
        }

    }


}
