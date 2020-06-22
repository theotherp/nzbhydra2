/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.google.common.base.Stopwatch;
import lombok.Data;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.junit.Ignore;
import org.junit.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.mapping.github.Release;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class Experiments {

    @Test
    @Ignore
    public void bla() throws IOException, InterruptedException {
        for (int i = 0; i < 1000; i++) {
            Call call = new OkHttpClient.Builder().build().newCall(new Request.Builder().url("http://127.0.0.1:5076/api?apikey=apikey&t=search&q=blade%20runner").build());
            call.execute();
            Thread.sleep(100);
        }
    }

    @Test
    @Ignore
    public void updateChangelogDates() throws Exception {
        File jsonFile = new File("..\\core\\src\\main\\resources\\changelog.json");
        OkHttpClient client = new OkHttpClient.Builder().build();
        Map<String, String> releaseDates = new HashMap<>();
        for (int i = 1; i <= 6; i++) {
            Response response = client.newCall(new Request.Builder().url("https://api.github.com/repos/theotherp/nzbhydra2/releases?page=" + i).build()).execute();

            ResponseBody body = response.body();
            List<Release> entries = Jackson.JSON_MAPPER.readValue(body.string(), new TypeReference<List<Release>>() {
            });
            for (Release entry : entries) {
                releaseDates.put(entry.getTagName(), entry.getPublishedAt().substring(0, 10));
            }
            Thread.sleep(250);
        }

        List<ChangelogVersionEntry> changelogEntries = Jackson.JSON_MAPPER.readValue(jsonFile, new TypeReference<List<ChangelogVersionEntry>>() {
        });

        List<ChangelogVersionEntry> updatedChangelogEntries = new ArrayList<>();
        for (ChangelogVersionEntry versionEntry : changelogEntries) {
            if (releaseDates.containsKey(versionEntry.getVersion())) {
                versionEntry.setDate(releaseDates.get(versionEntry.getVersion()));
            }
            updatedChangelogEntries.add(versionEntry);
        }

        Collections.sort(updatedChangelogEntries);
        Collections.reverse(updatedChangelogEntries);

        Jackson.JSON_MAPPER.writeValue(jsonFile, updatedChangelogEntries);

        System.out.println();
    }

    @Test
    @Ignore
    public void createSimpleYaml() throws IOException, InterruptedException {
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());
        objectMapper.registerModule(new Jdk8Module());

        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setCategoryMapping(new IndexerCategoryConfig());

        BaseConfig baseConfig = new BaseConfig();
        baseConfig.setIndexers(Arrays.asList(indexerConfig));
        String s = objectMapper.writeValueAsString(baseConfig);
        System.out.println(s);

        objectMapper.readValue(s, BaseConfig.class);
    }

    @Test
    @Ignore
    public void createTestYaml() throws IOException, InterruptedException {
        ObjectMapper objectMapper = new ObjectMapper(new YAMLFactory());

        MainClass mainClass = new MainClass();
        MainClass.SubEntry subEntry = new MainClass.SubEntry();
        subEntry.setSubSubentry(new MainClass.SubEntry.SubSubentry());
        mainClass.setSubEntries(Arrays.asList(subEntry));
        String s = objectMapper.writeValueAsString(mainClass);
        System.out.println(s);

        objectMapper.readValue(s, MainClass.class);
    }

    @Test
    @Ignore
    public void stressTest() throws Exception {

        OkHttpClient client = new OkHttpClient.Builder()
                .build();

        final int limit = 3000;
        final Stopwatch started = Stopwatch.createStarted();
        ExecutorService executorService = Executors.newFixedThreadPool(8);
        executeCalls(client, executorService, "api", limit);
        executeCalls(client, executorService, "torznab/api", limit);

//        for (int i = 0; i < limit; i++) {
//            Request request = new Request.Builder()
//                    .url("http://127.0.0.1:5076/api?apikey=apikey&t=search&q=bla" + i)
//                    .build();
//
//            System.out.println("b: " + i + "/" + limit);
//            Response response = client.newCall(request).execute();
//        }

        System.out.println(started.elapsed(TimeUnit.MILLISECONDS));

    }

    private void executeCalls(OkHttpClient client, ExecutorService executorService, String endpoint, int numberOfRuns) throws InterruptedException {
        executorService.invokeAll(IntStream.range(0, numberOfRuns).mapToObj(i -> (Callable<Object>) () -> {
            Thread.sleep(500);
            Request request = new Request.Builder()
//                    .url("http://127.0.0.1:5076/" + endpoint + "?apikey=apikey&t=search&q=blub" + i + "&cat=2000&cachetime=20")
                    .url("http://127.0.0.1:5076/" + endpoint + "?category=All&t=search&query=" + i + "&apikey=apikey")
                    .build();
            System.out.println("a: " + i + "/" + numberOfRuns);
            try {
                try (Response response = client.newCall(request).execute()) {
                    return response.isSuccessful();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
            return false;
        }).collect(Collectors.toList()));
    }

    @Data
    public static class MainClass {
        private List<SubEntry> subEntries = new ArrayList<>();

        @Data
        public static class SubEntry {
            private SubSubentry subSubentry;

            @Data
            public static class SubSubentry {
                private Integer entry1 = null;
                private Integer entry2 = null;
                private Integer entry3 = null;
            }

        }
    }


}
