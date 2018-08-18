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

package org.nzbhydra.tests.searching;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.config.IndexerConfigBuilder;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.nzbhydra.tests.NzbhydraMockMvcTest;
import org.popper.fw.interfaces.IPoFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;


@SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection")
@RunWith(SpringRunner.class)
@NzbhydraMockMvcTest
@TestPropertySource(locations = "classpath:config/application.properties")
public class ExternalApiEndToEndTest extends AbstractConfigReplacingTest {

    private IPoFactory factory;

    private MockWebServer mockWebServer = new MockWebServer();

    @Autowired
    SearchRepository searchRepository;
    String url = null;


    @Before
    public void setUp() throws IOException {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    mockWebServer.start(7070);
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }).start();
        System.setProperty("disableBlockUi", "true");
        System.setProperty("server.port", "5077");
        url = "http://127.0.0.1:5077";
    }


    @After
    public void tearDown() throws IOException {
        mockWebServer.close();
    }

    @Test
    public void shouldBuildCorrectLinksAndAllowNzbDownload() throws Exception {
        prepareFiveResultsFromOneIndexer();
        String body = getStringFromUrl("http://127.0.0.1:5077/api?apikey=apikey&t=search&q=whatever");
        //Extract link
        Matcher matcher = Pattern.compile("enclosure url=\"([^\"]+)\"").matcher(body);
        assertThat(matcher.find()).isTrue();
        String link = matcher.group(1);

        //Download NZB using link
        String nzbContent = getStringFromUrl(link);
        assertThat(nzbContent).isEqualTo("nzbcontent1");

        //And the same for the next link (to make sure multiple links are built correctly)
        assertThat(matcher.find()).isTrue();
        link = matcher.group(1);
        nzbContent = getStringFromUrl(link);
        assertThat(nzbContent).isEqualTo("nzbcontent2");

        //Also test that we can download the NZB using t=get
        matcher = Pattern.compile("\"guid\" value=\"([^\"]+)\"").matcher(body);
        assertThat(matcher.find()).isTrue();
        String guid = matcher.group(1);

        nzbContent = getStringFromUrl("http://127.0.0.1:5077/api?apikey=apikey&t=get&id=" + guid);
        assertThat(nzbContent).isEqualTo("nzbcontent1");
    }

    @Test
    public void shouldAllowTorrentFileDownload() throws Exception {
        replaceIndexers(Arrays.asList(IndexerConfigBuilder.builder().searchModuleType(SearchModuleType.TORZNAB).apiKey("apikey").build()));
        NewznabXmlItem result = RssItemBuilder.builder("result").category("5000").link(getMockServerBaseUrl() + "torrentlink").build();
        NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result), 0, 1);
        mockWebServer.enqueue(new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));
        mockWebServer.enqueue(new MockResponse().setBody("torrentcontent").setHeader("Content-Type", "application/xml; charset=utf-8"));

        String body = getStringFromUrl("http://127.0.0.1:5077/torznab/api?apikey=apikey&t=search&q=whatever");

        //Extract link
        Matcher matcher = Pattern.compile("enclosure url=\"([^\"]+)\"").matcher(body);
        assertThat(matcher.find()).isTrue();
        String link = matcher.group(1);

        //Download torrent using link
        String torrentContent = getStringFromUrl(link);
        assertThat(torrentContent).isEqualTo("torrentcontent");
    }

    @Test
    public void shouldAllowMagnetLinkDownload() throws Exception {
        replaceIndexers(Arrays.asList(IndexerConfigBuilder.builder().searchModuleType(SearchModuleType.TORZNAB).apiKey("apikey").build()));
        NewznabXmlItem result = RssItemBuilder.builder("result").category("5000").link("magnet:x&dn=y").build();
        NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result), 0, 1);
        mockWebServer.enqueue(new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));
        mockWebServer.enqueue(new MockResponse().setBody("torrentcontent").setHeader("Content-Type", "application/xml; charset=utf-8"));

        String body = getStringFromUrl("http://127.0.0.1:5077/torznab/api?apikey=apikey&t=search&q=whatever");

        //Extract link
        Matcher matcher = Pattern.compile("enclosure url=\"([^\"]+)\"").matcher(body);
        assertThat(matcher.find()).isTrue();
        String link = matcher.group(1);

        Response response = new OkHttpClient.Builder().build().newCall(new Request.Builder().url(link).build()).execute();
        assertThat(response.code()).isEqualTo(302);
        assertThat(response.header("Location")).isEqualTo("magnet:x&dn=y");
    }

    protected String getStringFromUrl(String s) throws IOException {
        return new OkHttpClient.Builder().build().newCall(new Request.Builder().url(s).build()).execute().body().string();
    }


    protected void prepareFiveResultsFromOneIndexer() throws Exception {
        replaceConfig(getClass().getResource("oneIndexer.json"));

        mockWebServer.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) throws InterruptedException {
                String mockServerBaseUrl = getMockServerBaseUrl();
                if (request.getRequestUrl().toString().contains("t=search")) {
                    NewznabXmlItem result1 = RssItemBuilder.builder("result1").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink1").hasNfo(false).grabs(1).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").build();
                    NewznabXmlItem result2 = RssItemBuilder.builder("result2").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink2").hasNfo(false).grabs(1).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").build();
                    NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result1, result2), 0, 2);
                    return new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8");
                } else if (request.getRequestUrl().toString().contains("nzblink1")) {
                    return new MockResponse().setBody("nzbcontent1").setHeader("Content-Type", "application/xml; charset=utf-8");
                } else if (request.getRequestUrl().toString().contains("nzblink2")) {
                    return new MockResponse().setBody("nzbcontent2").setHeader("Content-Type", "application/xml; charset=utf-8");
                } else {
                    return null;
                }

            }

        });
    }

    protected String getMockServerBaseUrl() {
        int mockServerPort = mockWebServer.getPort();
        return "http://127.0.0.1:" + mockServerPort + "/";
    }

    protected void prepareDuplicateAndTitleGroupedResults() throws IOException {
        replaceConfig(getClass().getResource("twoIndexers.json"));

        mockWebServer.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) throws InterruptedException {
                if (request.getRequestUrl().queryParameter("apikey").equals("apikey1")) {
                    NewznabXmlItem duplicate = RssItemBuilder.builder("duplicate").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).hasNfo(false).grabs(1).size(mbToBytes(3)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").link("link1").build();
                    NewznabXmlItem result2 = RssItemBuilder.builder("grouptitle").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).hasNfo(true).grabs(2).size(mbToBytes(2)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5040")))).category("TV SD").link("link2").build();
                    NewznabXmlItem result3 = RssItemBuilder.builder("grouptitle").pubDate(Instant.now().minus(3, ChronoUnit.DAYS)).comments("comments").grabs(3).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5030")))).category("TV HD").link("link3").build();
                    NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(duplicate, result2, result3), 0, 3);
                    return new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8");
                } else if (request.getRequestUrl().queryParameter("apikey").equals("apikey2")) {
                    NewznabXmlItem duplicate = RssItemBuilder.builder("duplicate").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).hasNfo(false).grabs(1).size(mbToBytes(3)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").link("link4").build();

                    NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(duplicate), 0, 1);
                    return new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8");
                } else {
                    throw new RuntimeException("Unexpected api key " + request.getRequestUrl().queryParameter("apikey"));
                }
            }
        });
    }

    private long mbToBytes(int mb) {
        return mb * 1024L * 1024L;
    }

}