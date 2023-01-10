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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import com.google.common.base.Stopwatch;
import lombok.Data;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerConfig;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class Experiments {

    @Test
    @Disabled
    void bla() throws IOException, InterruptedException {
        for (int i = 0; i < 1000; i++) {
            Call call = new OkHttpClient.Builder().build().newCall(new Request.Builder().url("http://127.0.0.1:5076/api?apikey=apikey&t=search&q=blade%20runner").build());
            call.execute();
            Thread.sleep(100);
        }
    }


    @Test
    @Disabled
    void createSimpleYaml() throws IOException, InterruptedException {
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
    @Disabled
    void createTestYaml() throws IOException, InterruptedException {
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
    @Disabled
    void stressTest() throws Exception {

        OkHttpClient client = new OkHttpClient.Builder()
            .build();

        final int limit = 315;
        final Stopwatch started = Stopwatch.createStarted();
        ExecutorService executorService = Executors.newFixedThreadPool(8);
        executeCalls(client, executorService, "api", limit);

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
            Thread.sleep(100);
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
