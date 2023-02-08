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

package org.nzbhydra.indexers;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.web.WebConfiguration;
import org.springframework.oxm.Unmarshaller;

import javax.xml.transform.stream.StreamSource;
import java.io.IOException;
import java.io.StringReader;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Ensures that different indexers' APIs are the way we assume.
 */
@EnabledIfEnvironmentVariable(named = "DEV_ENV_SET", matches = "true")
public class IndexerIdiocyCheckTest {

    private final NzbGeek nzbGeek = new NzbGeek(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    private final DogNzb dogNzb = new DogNzb(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);

    protected Unmarshaller unmarshaller = new WebConfiguration().marshaller();

    private record IndexerData(String host, String evvKey) {
    }

    @Test
    public void shouldTestDog() throws Exception {
        SoftAssertions softly = new SoftAssertions();

        final IndexerData indexer = new IndexerData("api.dognzb.cr", "DOG");
        //TV + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, "1080p", false), dogNzb))
            .isNull();
        Thread.sleep(50);

        //TV + ID + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, null, true), dogNzb))
            .isNull();
        Thread.sleep(50);

        //TV + title is actually supported. But how do we know if a title or quality is provided? Is it better to switch or to keep it and perhaps not find anything?
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, "lost", false), dogNzb))
            .isNull();
        Thread.sleep(50);

        //TV + title + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, "lost 1080p", true), dogNzb))
            .isNull();
        Thread.sleep(50);

        //Movie + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "1080p", false), dogNzb))
            .isNull();

        Thread.sleep(50);
        //Movie + ID + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "1080p", true), dogNzb))
            .isNull();
        Thread.sleep(50);

        //Movie + title is actually supported. But how do we know if a title or quality is provided? Is it better to switch or to keep it and perhaps not find anything?
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "beauty", false), dogNzb))
            .isNotNull();
        Thread.sleep(50);

        //Movie + title + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "beauty 1080p", true), dogNzb))
            .isNull();
        softly.assertAll();
    }

    @Test
    public void shouldTestNzbgeek() throws Exception {
        SoftAssertions softly = new SoftAssertions();

        final IndexerData indexer = new IndexerData("api.nzbgeek.info", "NZBGEEK");
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, "1080p", false), nzbGeek))
            .isNull();
        Thread.sleep(1000);

        //TV + ID + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, null, true), nzbGeek))
            .isNull();
        Thread.sleep(1000);

        //TV + title
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, "lost", false), nzbGeek))
            .isNull();
        Thread.sleep(1000);

        //TV + title + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.TVSEARCH, "lost 1080p", true), nzbGeek))
            .isNull();
        Thread.sleep(1000);

        //Movie + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "1080p", false), nzbGeek))
            .isNull();

        Thread.sleep(1000);
        //Movie + ID + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "1080p", true), nzbGeek))
            .isNull();
        Thread.sleep(1000);

        //Movie + title is actually supported. But how do we know if a title or quality is provided? Is it better to switch or to keep it and perhaps not find anything?
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "beauty", false), nzbGeek))
            .isNotNull();
        Thread.sleep(1000);

        //Movie + title + quality
        softly.assertThat(search(indexer.host, indexer.evvKey, buildSearchRequest(SearchType.MOVIE, "beauty 1080p", true), nzbGeek))
            .isNull();
        softly.assertAll();
    }

    private static SearchRequest buildSearchRequest(SearchType searchType, String query, boolean withId) {
        SearchRequest searchRequest = new SearchRequest(SearchSource.API, searchType, 0, 1);
        searchRequest.setQuery(query);
        final HashMap<MediaIdType, String> identifiers = new HashMap<>();
        if (withId && searchType == SearchType.MOVIE) {
            identifiers.put(MediaIdType.IMDB, "tt0348913");
        } else if (withId && searchType == SearchType.TVSEARCH) {
            identifiers.put(MediaIdType.TVDB, "73739");
        }
        searchRequest.setIdentifiers(identifiers);
        return searchRequest;
    }

    private String search(String host, String API_KEY_IDENTIFIER, SearchRequest searchRequest, Newznab indexer) throws IOException {
        final OkHttpClient client = new OkHttpClient.Builder()
            .readTimeout(10, TimeUnit.SECONDS)
            .connectTimeout(10, TimeUnit.SECONDS)
            .build();
        final String response;
        Set<String> parts = new HashSet<>();
        searchRequest.getQuery().ifPresent(x -> parts.add("q=" + x));
        if (searchRequest.getIdentifiers().containsKey(MediaIdType.IMDB)) {
            parts.add("imdbId=" + searchRequest.getIdentifiers().get(MediaIdType.IMDB));
        }
        if (searchRequest.getIdentifiers().containsKey(MediaIdType.TVDB)) {
            parts.add("tvdbid=" + searchRequest.getIdentifiers().get(MediaIdType.TVDB));
        }
        final String url = String.format("https://" + host + "/api?apikey=%s&t=" + searchRequest.getSearchType().name().toLowerCase() + "&extended=1&&password=1&" + String.join("&", parts), System.getenv("API_KEY_" + API_KEY_IDENTIFIER));
        try (Response indexerResponse = client.newCall(new Request.Builder()
            .url(url)
            .build()).execute()) {
            response = indexerResponse.body().string();
        }
        NewznabXmlRoot root = (NewznabXmlRoot) unmarshaller.unmarshal(new StreamSource(new StringReader(response)));
        if (root.getRssChannel().getItems().size() > 10) {
            if (indexer.isSwitchToTSearchNeeded(searchRequest)) {
                return "Indexer " + host + " supports " + searchRequest + " but switch to search is implemented";
            }
        }
        if (root.getRssChannel().getItems().size() < 10) {
            if (!indexer.isSwitchToTSearchNeeded(searchRequest)) {
                return "Indexer " + host + " does not support " + searchRequest + " but switch to search is not implemented";
            }
        }
        return null;
    }

}
