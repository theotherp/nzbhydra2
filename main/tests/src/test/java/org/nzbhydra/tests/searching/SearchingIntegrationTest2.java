package org.nzbhydra.tests.searching;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.nzbhydra.tests.pageobjects.ColumnSortable;
import org.nzbhydra.tests.pageobjects.FreetextFilter;
import org.nzbhydra.tests.pageobjects.IColumnSortable;
import org.nzbhydra.tests.pageobjects.IFreetextFilter;
import org.nzbhydra.tests.pageobjects.SearchPagePO;
import org.nzbhydra.tests.pageobjects.SearchResultsPO;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriverService;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.popper.fw.interfaces.IPoFactory;
import org.popper.fw.webdriver.DefaultWebdriverConfig;
import org.popper.fw.webdriver.WebdriverContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

@RunWith(SpringRunner.class)
@SpringBootTest(webEnvironment = WebEnvironment.DEFINED_PORT, classes = NzbHydra.class)
//@WebMvcTest
//@DataJpaTest
//@ContextConfiguration(classes=NzbHydra.class)
@AutoConfigureMockMvc
@TestPropertySource(locations = "classpath:config/application.properties")
public class SearchingIntegrationTest2 extends AbstractConfigReplacingTest {

    private final static String PHANTJOMJS = "c:\\programme\\phantomjs-2.1.1-windows\\bin\\phantomjs.exe";

    private MockWebServer mockWebServer = new MockWebServer();
    WebDriver webDriver = null;

    @Autowired
    private ConfigProvider configProvider;

    @Before
    public void setUp() throws IOException {
        mockWebServer.start(7070);
        System.setProperty("main.welcomeShown", "true");
        //initializePhantomJs();
        initializeChromeDriver();
    }

    protected void initializeChromeDriver() {
        System.setProperty("webdriver.chrome.driver", "c:\\programme\\chromedriver\\chromedriver.exe");
        webDriver = new ChromeDriver();
    }

    protected void initializePhantomJs() {
        DesiredCapabilities caps = new DesiredCapabilities();
        caps.setJavascriptEnabled(true);
        caps.setCapability("takesScreenshot", true);
        caps.setCapability(
                PhantomJSDriverService.PHANTOMJS_EXECUTABLE_PATH_PROPERTY, PHANTJOMJS);
        webDriver = new PhantomJSDriver(caps);
    }

    @After
    public void tearDown() throws IOException {
        mockWebServer.close();
        webDriver.quit();
    }

    @Test
    public void shouldSearch() throws Exception {
        prepareFiveResultsFromTwoIndexers();

        String url = "http://127.0.0.1:5077";

        WebdriverContext context = new WebdriverContext();
        context.setConfig(new WebdriverConfig(webDriver, url));
        context.getDefaultElementFactory().addImplClassForElement(IColumnSortable.class, ColumnSortable.class);
        context.getDefaultElementFactory().addImplClassForElement(IFreetextFilter.class, FreetextFilter.class);
        IPoFactory factory = context.getFactory();
        SearchPagePO searchPage = factory.createPage(SearchPagePO.class);
        searchPage.open();
        searchPage.searchField().text("1");
        searchPage.goButton().click();
        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("search-results-table")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        assertThat(searchResultsPage.searchResultRows().size()).isEqualTo(5);
        assertThat(searchResultsPage.searchResultRows().get(0).title().text()).isEqualTo("indexer1-result1");
        assertThat(searchResultsPage.searchResultRows().get(4).title().text()).isEqualTo("indexer2-result2");

        searchResultsPage.tableHeader().titleFilter().filterBy("indexer1");
        assertThat(searchResultsPage.searchResultRows().size()).isEqualTo(3);
        searchResultsPage.tableHeader().titleFilter().clear();
    }

    protected void prepareFiveResultsFromTwoIndexers() throws IOException {
        replaceConfig(getClass().getResource("twoIndexers.json"));
        RssItem result1 = RssItemBuilder.builder("indexer1-result1").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).size(1000000).category("TV").build();
        RssItem result2 = RssItemBuilder.builder("indexer1-result2").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).size(2000000).category("TV SD").build();
        RssItem result3 = RssItemBuilder.builder("indexer1-result3").pubDate(Instant.now().minus(3, ChronoUnit.DAYS)).size(3000000).category("TV HD").build();
        RssRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result1, result2, result3), 0, 3);
        mockWebServer.enqueue(new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));

        RssItem result4 = RssItemBuilder.builder("indexer2-result1").pubDate(Instant.now().minus(4, ChronoUnit.DAYS)).size(4000000).category("Movies").build();
        RssItem result5 = RssItemBuilder.builder("indexer2-result2").pubDate(Instant.now().minus(5, ChronoUnit.DAYS)).size(5000000).category("Movies HD").build();
        rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result4, result5), 0, 2);
        mockWebServer.enqueue(new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));

        configProvider.getBaseConfig().getMain().setWelcomeShown(true); //I don't understand why this isn't taken from the properties
    }


    public class WebdriverConfig extends DefaultWebdriverConfig {

        WebDriver webDriver;
        String baseUrl;

        public WebdriverConfig(WebDriver webDriver, String baseUrl) {
            this.webDriver = webDriver;
            this.baseUrl = baseUrl;
        }

        @Override
        public WebDriver createDriver() {
            return webDriver;
        }

        @Override
        public String getBaseUrl() {
            return baseUrl;
        }


    }

}