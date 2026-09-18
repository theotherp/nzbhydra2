

package org.nzbhydra.discord;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import net.dv8tion.jda.api.JDA;
import net.dv8tion.jda.api.JDABuilder;
import net.dv8tion.jda.api.entities.channel.concrete.TextChannel;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;


public class DiscordPublisher {

    private static final String TEMPLATE = """
            %s

            Link: https://github.com/theotherp/nzbhydra2/releases/tag/v%s
            """;

    //Discord rejects any message longer than this
    private static final int MAX_MESSAGE_LENGTH = 2000;


    public static void main(String[] args) throws Exception {

        final ObjectMapper yamlMapper = new ObjectMapper(new YAMLFactory());

        File changelogYamlFile = new File(args[0]);
        String tagName = args[1];
        String discordToken = Files.readString(Paths.get(args[2])).replaceAll("\n", "").replace(" ", "").strip();
        boolean dryRun = Boolean.parseBoolean(args[3]);

        if (!changelogYamlFile.exists()) {
            throw new RuntimeException("JSON file does not exist: " + changelogYamlFile.getAbsolutePath());
        }

        List<ChangelogVersionEntry> entries;
        try {
            entries = yamlMapper.readValue(Files.readAllBytes(changelogYamlFile.toPath()), new TypeReference<>() {
            });
        } catch (IOException e) {
            throw new RuntimeException("Unable to read JSON file", e);
        }
        Collections.sort(entries);
        Collections.reverse(entries);

        final ChangelogVersionEntry entry = entries.stream().filter(x -> x.getVersion().equals("v" + tagName)).findFirst().orElseThrow();
        final String joined = String.join("\n", getMarkdownLinesFromEntry(entry));
        final String message = String.format(TEMPLATE, joined, tagName)
                .replaceAll("### (.*)\n", "**$1**\n");

        final List<String> messageParts = splitMessage(message);

        System.out.println("Sending message to release channel(s) in " + messageParts.size() + " part(s):\n" + message);
        if (dryRun) {
            System.out.println("Not sending message because of dry run");
            return;
        }
        JDA jda = JDABuilder.createDefault(discordToken).build().awaitReady();
        try {
            final List<TextChannel> channels = jda.getTextChannels().stream().filter(x -> x.getName().equals("releases")).toList();
            if (channels.isEmpty()) {
                throw new RuntimeException("Found no channel named 'releases'");
            }
            for (TextChannel channel : channels) {
                try {
                    for (String part : messageParts) {
                        channel.sendMessage(part).complete();
                    }
                    System.out.println("Sent message to channel " + channel.getName() + " in guild " + channel.getGuild().getName());
                } catch (Exception e) {
                    throw new RuntimeException("If permissions are missing even though the bot should have them set the permissions in the channel manually for the bot", e);
                }
            }
        } finally {
            //shutdown() only closes gracefully once all queued requests are done, which may never happen
            jda.shutdownNow();
        }
        //JDA keeps non-daemon threads alive even after shutdown, which would keep the JVM running forever
        System.exit(0);
    }


    /**
     * Splits the message into parts that Discord accepts, breaking at line boundaries where possible.
     */
    static List<String> splitMessage(String message) {
        List<String> parts = new ArrayList<>();
        StringBuilder currentPart = new StringBuilder();
        for (String line : message.split("\n", -1)) {
            for (String chunk : splitLongLine(line)) {
                //+1 for the line break that would be added
                if (!currentPart.isEmpty() && currentPart.length() + 1 + chunk.length() > MAX_MESSAGE_LENGTH) {
                    parts.add(currentPart.toString().strip());
                    currentPart.setLength(0);
                }
                if (!currentPart.isEmpty()) {
                    currentPart.append("\n");
                }
                currentPart.append(chunk);
            }
        }
        if (!currentPart.toString().isBlank()) {
            parts.add(currentPart.toString().strip());
        }
        return parts;
    }

    /**
     * Hard-splits a single line that doesn't fit into one message, preferring word boundaries.
     */
    private static List<String> splitLongLine(String line) {
        List<String> chunks = new ArrayList<>();
        String rest = line;
        while (rest.length() > MAX_MESSAGE_LENGTH) {
            int splitAt = rest.lastIndexOf(' ', MAX_MESSAGE_LENGTH);
            if (splitAt <= 0) {
                splitAt = MAX_MESSAGE_LENGTH;
            }
            chunks.add(rest.substring(0, splitAt));
            rest = rest.substring(splitAt).stripLeading();
        }
        chunks.add(rest);
        return chunks;
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
            final String text = normalizeLineBreaks(changeEntry.getText())
                .replaceAll("#(\\d{3,})", "https://github.com/theotherp/nzbhydra2/issues/$1");
            lines.add("**" + StringUtils.capitalize(changeEntry.getType()) + "** " + text);
        }
        lines.add("");
        return lines;
    }

    private static String normalizeLineBreaks(String text) {
        return text
                .replace("\\n", "\n")
                .replace("\r\n", "\n")
                .replace("\r", "\n");
    }


}
