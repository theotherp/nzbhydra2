/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.discordbot;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.dv8tion.jda.core.JDA;
import net.dv8tion.jda.core.JDABuilder;
import net.dv8tion.jda.core.entities.TextChannel;
import net.dv8tion.jda.core.events.ReadyEvent;
import net.dv8tion.jda.core.events.message.MessageReceivedEvent;
import net.dv8tion.jda.core.hooks.ListenerAdapter;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

import javax.security.auth.login.LoginException;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DiscordBot extends ListenerAdapter {

    private final ExecutorService executorService = Executors.newFixedThreadPool(1);

    private final Set<String> alreadyPublishedVersions = new HashSet<>();

    private static String githubToken;


    public static void main(String[] args) throws LoginException {
        String discordToken = System.getProperty("discordToken");
        if (discordToken == null) {
            throw new RuntimeException("Empty discord token");
        }

        githubToken = System.getProperty("githubToken");
        if (githubToken == null) {
            throw new RuntimeException("Empty githubToken token");
        }

        JDA jda = new JDABuilder(discordToken).build();
        jda.addEventListener(new DiscordBot());
    }

    @Override
    public void onMessageReceived(MessageReceivedEvent event) {

    }

    @Override
    public void onReady(ReadyEvent event) {


        executorService.submit(new Runnable() {
            @Override
            public void run() {
                if (alreadyPublishedVersions.isEmpty()) {
                    try {
                        loadAlreadyPublishedVersions(event);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
                while (!Thread.interrupted()) {
                    try {
                        System.out.println("LOading releases");
                        List<Release> releases = getReleases();
                        for (Release release : releases) {
                            if (alreadyPublishedVersions.contains(release.getTagName())) {
                                continue;
                            }
                            if (release.getDraft()) {
                                continue;
                            }

                            System.out.println("Publishing release of " + release.getTagName());

                            TextChannel channel = getReleasesChannel(event);
                                /*
                                New release: v2.11.0 BETA

                                Changelog:
                                **Fix**: Some fix
                                **Feature**: Some feature

                                Link: https://github.com/theotherp/nzbhydra2/releases/tag/v2.11.0
                                 */

                            String messageBuilder =
                                    release.getBody() +
                                            "\n" +
                                            release.getHtmlUrl();
                            channel.sendMessage(messageBuilder).complete();
                            alreadyPublishedVersions.add(release.getTagName());
                        }


                        Thread.sleep(60_000);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

            }
        });
    }

    private void loadAlreadyPublishedVersions(ReadyEvent event) throws Exception {
        List<Release> releases = getReleases();
        getReleasesChannel(event).getIterableHistory().stream().limit(500).forEach(x -> {
            for (Release release : releases) {
                if (LocalDateTime.parse(release.getPublishedAt(), DateTimeFormatter.ISO_DATE_TIME).isBefore(LocalDateTime.now().minus(1, ChronoUnit.DAYS))) {
                    System.out.println("Ignoring release " + release.getTagName() + " published at " + release.getPublishedAt());
                    alreadyPublishedVersions.add(release.getTagName());
                    continue;
                }

                if (x.getContentRaw().contains(release.getTagName())) {
                    alreadyPublishedVersions.add(release.getTagName());
                }
            }

        });


    }

    private TextChannel getReleasesChannel(ReadyEvent event) {
        return event.getJDA().getTextChannels().stream().filter(x -> x.getName().equals("releases") && x.getGuild().getName().equalsIgnoreCase("NZBHydra")).findFirst().get();
    }

    private List<Release> getReleases() throws IOException {
        Request.Builder requestBuilder = new Request.Builder().url("https://api.github.com/repos/theotherp/nzbhydra2/releases");
        requestBuilder.header("Authorization", "token " + githubToken);
        Response response = new OkHttpClient.Builder().build().newCall(requestBuilder.build()).execute();
        if (!response.isSuccessful()) {
            throw new RuntimeException(response.message());
        }
        List<Release> releases;
        try (ResponseBody body = response.body()) {
            String bodyString = body.string();
            releases = new ObjectMapper().readValue(bodyString, new TypeReference<List<Release>>() {
            });
        }
        return releases;
    }
}
