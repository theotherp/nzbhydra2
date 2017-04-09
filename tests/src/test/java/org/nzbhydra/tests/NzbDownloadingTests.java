package org.nzbhydra.tests;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Sets;
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
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.config.NzbAddingType;
import org.nzbhydra.database.IndexerEntity;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.downloader.DownloaderProvider;
import org.nzbhydra.web.mapping.AddNzbsRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

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
        searchResult = searchResultRepository.save(searchResult);
        searchResultId = searchResult.getId();

        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setDownloaderType(DownloaderType.SABNZBD);
        downloaderConfig.setName("sabnzbd");
        downloaderConfig.setUrl("http://127.0.0.1:7070/sabnzbd/");
        downloaderConfig.setNzbAccessType(NzbAccessType.REDIRECT);
        downloaderConfig.setNzbAddingType(NzbAddingType.SEND_LINK);
        downloaderConfig.setApiKey("apikey");
        baseConfig.getDownloaders().clear();
        baseConfig.getDownloaders().add(downloaderConfig);
        downloaderProvider.handleNewConfig(new ConfigChangedEvent(this, baseConfig));
    }

    @Test
    public void shouldRedirectToIndexer() throws Exception {
        baseConfig.getSearching().setNzbAccessType(NzbAccessType.REDIRECT);
        mvc.perform(MockMvcRequestBuilders.get("/getnzb/api/" + searchResultId).with(csrf())).andExpect(status().is(307)).andExpect(header().string("Location", "http://127.0.0.1:7070/getnzb?id=123"));
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
    public void shouldSendUrlToDownloader() throws Exception {
        baseConfig.getDownloaders().get(0).setNzbAddingType(NzbAddingType.SEND_LINK);

        HttpRequest expectedRequest = HttpRequest.request("/sabnzbd/api").withQueryStringParameter("mode", "addurl").withQueryStringParameter("name", "http://127.0.0.1:5076/getnzb/api/" + searchResultId).withMethod("POST");
        mockServer.when(expectedRequest).respond(HttpResponse.response().withStatusCode(200).withBody("{\"isStatus\":true}"));

        MockHttpServletRequestBuilder request = MockMvcRequestBuilders.put("/internalapi/downloader/addNzbs");
        AddNzbsRequest addNzbsRequest = new AddNzbsRequest("sabnzbd", Sets.newHashSet(searchResultId));
        request.contentType(MediaType.APPLICATION_JSON_VALUE);
        request.content(new ObjectMapper().writeValueAsString(addNzbsRequest));
        request.with(csrf());
        ResultActions perform = mvc.perform(request);
        perform.andExpect(status().is(200));
        mockServer.verify(expectedRequest);
    }


}
