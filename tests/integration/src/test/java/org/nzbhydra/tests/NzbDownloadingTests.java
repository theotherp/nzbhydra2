package org.nzbhydra.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockserver.integration.ClientAndProxy;
import org.mockserver.integration.ClientAndServer;
import org.mockserver.model.HttpRequest;
import org.mockserver.model.HttpResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.downloading.DownloaderType;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.downloading.AddFilesRequest;
import org.nzbhydra.downloading.downloaders.DownloaderProvider;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.test.autoconfigure.core.AutoConfigureCache;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureDataJpa;
import org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureTestEntityManager;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringExtension;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
@Transactional
@AutoConfigureCache
@AutoConfigureDataJpa
@AutoConfigureTestDatabase
@AutoConfigureTestEntityManager
@ImportAutoConfiguration
@TestPropertySource(locations = "classpath:/org/nzbhydra/tests/downloadingTests.properties")
@DirtiesContext
//For some reason multiple indexers are loaded. Looks like TestPropertySource doesn't work
@Disabled
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
    @Autowired
    private SearchModuleProvider searchModuleProvider;

    private MockMvc mvc;
    private ClientAndProxy proxy;
    private ClientAndServer mockServer;
    private long searchResultId;


    @AfterEach
    public void stopProxy() {
        proxy.stop();
        mockServer.stop();
    }

    @BeforeEach
    public void setup() throws Exception {
        System.setProperty("nzbhydra.dev.noApiKey", "true");
        System.setProperty("server.host", "127.0.0.1");

        mockServer = startClientAndServer(7071);
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
        baseConfig.getDownloading().setNzbAccessType(FileDownloadAccessType.REDIRECT);
        downloaderProvider.handleNewConfig(new ConfigChangedEvent(this, baseConfig, baseConfig));
        searchModuleProvider.loadIndexers(baseConfig.getIndexers());
    }

    @Test
    public void shouldRedirectToIndexer() throws Exception {
        baseConfig.getDownloading().setNzbAccessType(FileDownloadAccessType.REDIRECT);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/" + searchResultId).with(csrf())).andExpect(status().is(HttpStatus.FOUND.value())).andExpect(header().string("Location", "http://127.0.0.1:7070/getnzb?id=123"));
    }

    @Test
    public void shouldDownloadNzbFromIndexer() throws Exception {
        mockServer.when(HttpRequest.request()).respond(HttpResponse.response().withBody("NZBContent"));
        baseConfig.getDownloading().setNzbAccessType(FileDownloadAccessType.PROXY);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/" + searchResultId).with(csrf())).andExpect(result -> {
            result.getResponse().getStatus();
        }).andExpect(content().string("NZBContent"));
    }

    @Test
    public void shouldReturnErrorCodeWhenNzbNotFound() throws Exception {
        baseConfig.getDownloading().setNzbAccessType(FileDownloadAccessType.PROXY);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/123").with(csrf())).andExpect(result -> {
            result.getResponse().getStatus();
        }).andExpect(content().string("<error code=\"300\" description=\"Invalid or outdated search result ID\"/>"));

        mvc.perform(MockMvcRequestBuilders.get("/api?t=get&id=123").with(csrf())).andExpect(result -> {
            result.getResponse().getStatus();
        }).andExpect(content().string("<error code=\"300\" description=\"Invalid or outdated search result ID\"/>"));
    }

    @Test
    @Disabled //Went kaputt when switching to Spring Boot 2.1
    public void shouldSendUrlToDownloader() throws Exception {
        baseConfig.getDownloading().getDownloaders().get(0).setNzbAddingType(NzbAddingType.SEND_LINK);
        //http://127.0.0.1:7070/sabnzbd/api?apikey=apikey&output=json&mode=addurl&name=http://127.0.0.1:5076/getnzb/api/5293954792479313301?apikey&nzbname=someNzb.nzb
        //http://192.168.1.111:5077/getnzb/api/-338204003302262369?apikey
        HttpRequest expectedRequest = HttpRequest
            .request("/sabnzbd/api")
            .withQueryStringParameter("mode", "addurl")
            .withQueryStringParameter("name", "http://localhost/getnzb/api/" + searchResultId + "?apikey=apikey")
            .withMethod("POST");
        mockServer.when(expectedRequest).respond(HttpResponse.response().withStatusCode(200).withBody("{\"isStatus\":true}"));

        MockHttpServletRequestBuilder request = MockMvcRequestBuilders.put("/internalapi/downloader/addNzbs");
        SearchResultWebTO item = SearchResultWebTO.builder().searchResultId(String.valueOf(searchResultId)).build();
        AddFilesRequest addNzbsRequest = new AddFilesRequest("sabnzbd", Collections.singletonList(new AddFilesRequest.SearchResult(item.getSearchResultId(), item.getOriginalCategory(), item.getCategory())), "");
        request.contentType(MediaType.APPLICATION_JSON_VALUE);
        request.content(new ObjectMapper().writeValueAsString(addNzbsRequest));
        request.with(csrf());
        ResultActions perform = mvc.perform(request);
        perform.andExpect(status().is(200));
        mockServer.verify(expectedRequest);
    }


}
