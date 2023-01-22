/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

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

            Link: https://github.com/theotherp/nzbhydra2/releases/tag/%s
            """;


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

        final ChangelogVersionEntry entry = entries.get(0);
        final String joined = String.join("\n", getMarkdownLinesFromEntry(entry));
        final String message = String.format(TEMPLATE, joined, tagName)
                .replaceAll("### (.*)\n", "**$1**\n");

        System.out.println("Sending message to release channel(s):\n" + message);
        if (dryRun) {
            System.out.println("Not sending message because of dry run");
            return;
        }
        JDA jda = JDABuilder.createDefault(discordToken).build().awaitReady();
        final List<TextChannel> channels = jda.getTextChannels().stream().filter(x -> x.getName().equals("releases")).toList();
        for (TextChannel channel : channels) {
            channel.sendMessage(message).queue();
        }
        jda.shutdown();
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
            final String text = changeEntry.getText()
                    .replaceAll("#(\\d{3,})", "<a href=\"https://github.com/theotherp/nzbhydra2/issues/$1\">#$1</a>");
            lines.add("**" + StringUtils.capitalize(changeEntry.getType()) + "** " + text);
        }
        lines.add("");
        return lines;
    }


}
