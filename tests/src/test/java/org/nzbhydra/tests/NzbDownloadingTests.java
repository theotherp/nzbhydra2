package org.nzbhydra.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockserver.integration.ClientAndProxy;
import org.mockserver.integration.ClientAndServer;
import org.mockserver.model.HttpRequest;
import org.mockserver.model.HttpResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.config.DownloaderType;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.config.NzbAddingType;
import org.nzbhydra.downloading.AddNzbsRequest;
import org.nzbhydra.downloading.DownloaderProvider;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultRepository;
import org.nzbhydra.searching.SearchResultWebTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.util.Collections;

import static org.mockserver.integration.ClientAndProxy.startClientAndProxy;
import static org.mockserver.integration.ClientAndServer.startClientAndServer;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)

@DataJpaTest

@TestPropertySource(locations = "classpath:/org/nzbhydra/tests/downloadingTests.properties")
@DirtiesContext
public class NzbDownloadingTests {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private BaseConfig baseConfig;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private DownloaderProvider downloaderProvider;

    private MockMvc mvc;
    private ClientAndProxy proxy;
    private ClientAndServer mockServer;
    private long searchResultId;


    @After
    public void stopProxy() {
        proxy.stop();
        mockServer.stop();
    }

    @Before
    public void setup() throws Exception {
        System.setProperty("nzbhydra.dev.noApiKey", "true");
        System.setProperty("server.host", "127.0.0.1");

        mockServer = startClientAndServer(7070);
        proxy = startClientAndProxy(7072);
        mvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();

        IndexerEntity indexer = new IndexerEntity();
        indexer.setName("indexer");
        indexerRepository.save(indexer);

        searchResultRepository.deleteAll();
        SearchResultEntity searchResult = new SearchResultEntity();

        searchResult.setIndexer(indexer);
        searchResult.setIndexerGuid("someNzbd");
        searchResult.setLink("http://127.0.0.1:7070/getnzb?id=123");
        searchResult.setTitle("someNzb");
        searchResult.setPubDate(Instant.now());
        searchResult.setFirstFound(Instant.now());
        searchResult = searchResultRepository.save(searchResult);
        searchResultId = searchResult.getId();

        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName("indexer");
        indexerConfig.setHost("http://127.0.0.1:7070");
        baseConfig.getIndexers().add(indexerConfig);

        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setDownloaderType(DownloaderType.SABNZBD);
        downloaderConfig.setName("sabnzbd");
        downloaderConfig.setUrl("http://127.0.0.1:7070/sabnzbd/");
        downloaderConfig.setNzbAddingType(NzbAddingType.SEND_LINK);
        downloaderConfig.setApiKey("apikey");
        baseConfig.getDownloading().getDownloaders().clear();
        baseConfig.getDownloading().getDownloaders().add(downloaderConfig);
        baseConfig.getSearching().setNzbAccessType(NzbAccessType.REDIRECT);
        downloaderProvider.handleNewConfig(new ConfigChangedEvent(this, new BaseConfig(), baseConfig));
    }

    @Test
    public void shouldRedirectToIndexer() throws Exception {
        baseConfig.getSearching().setNzbAccessType(NzbAccessType.REDIRECT);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/" + searchResultId).with(csrf())).andExpect(status().is(HttpStatus.FOUND.value())).andExpect(header().string("Location", "http://127.0.0.1:7070/getnzb?id=123"));
    }

    @Test
    public void shouldDownloadNzbFromIndexer() throws Exception {
        mockServer.when(HttpRequest.request()).respond(HttpResponse.response().withBody("NZBContent"));
        baseConfig.getSearching().setNzbAccessType(NzbAccessType.PROXY);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/" + searchResultId).with(csrf())).andExpect(result -> {
            result.getResponse().getStatus();
        }).andExpect(content().string("NZBContent"));
    }

    @Test
    public void shouldReturnErrorCodeWhenNzbNotFound() throws Exception {
        baseConfig.getSearching().setNzbAccessType(NzbAccessType.PROXY);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/123").with(csrf())).andExpect(result -> {
            result.getResponse().getStatus();
        }).andExpect(content().string("<error code=\"300\" description=\"Invalid or outdated search result ID\"/>"));

        mvc.perform(MockMvcRequestBuilders.get("/api?t=get&id=123").with(csrf())).andExpect(result -> {
            result.getResponse().getStatus();
        }).andExpect(content().string("<error code=\"300\" description=\"Invalid or outdated search result ID\"/>"));
    }

    @Test
    public void shouldSendUrlToDownloader() throws Exception {
        baseConfig.getDownloading().getDownloaders().get(0).setNzbAddingType(NzbAddingType.SEND_LINK);
        //http://127.0.0.1:7070/sabnzbd/api?apikey=apikey&output=json&mode=addurl&name=http://127.0.0.1:5076/getnzb/api/5293954792479313301?apikey&nzbname=someNzb.nzb
        //http://192.168.1.111:5077/getnzb/api/-338204003302262369?apikey
        HttpRequest expectedRequest = HttpRequest
                .request("/sabnzbd/api")
                .withQueryStringParameter("mode", "addurl")
                .withQueryStringParameter("name", "http://127.0.0.1:5077/getnzb/api/" + searchResultId + "?apikey")
                .withMethod("POST");
        mockServer.when(expectedRequest).respond(HttpResponse.response().withStatusCode(200).withBody("{\"isStatus\":true}"));

        MockHttpServletRequestBuilder request = MockMvcRequestBuilders.put("/internalapi/downloader/addNzbs");
        SearchResultWebTO item = SearchResultWebTO.builder().searchResultId(String.valueOf(searchResultId)).build();
        AddNzbsRequest addNzbsRequest = new AddNzbsRequest("sabnzbd", Collections.singletonList(item), "");
        request.contentType(MediaType.APPLICATION_JSON_VALUE);
        request.content(new ObjectMapper().writeValueAsString(addNzbsRequest));
        request.with(csrf());
        ResultActions perform = mvc.perform(request);
        perform.andExpect(status().is(200));
        mockServer.verify(expectedRequest);
    }


}
