package org.nzbhydra.tests.searching;

import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.mapping.newznab.NewznabAttribute;
import org.nzbhydra.mapping.newznab.RssItem;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.nzbhydra.tests.NzbhydraMockMvcTest;
import org.nzbhydra.tests.pageobjects.CheckBox;
import org.nzbhydra.tests.pageobjects.CheckboxFilter;
import org.nzbhydra.tests.pageobjects.ColumnSortable;
import org.nzbhydra.tests.pageobjects.FreetextFilter;
import org.nzbhydra.tests.pageobjects.ICheckBox;
import org.nzbhydra.tests.pageobjects.ICheckboxFilter;
import org.nzbhydra.tests.pageobjects.IColumnSortable;
import org.nzbhydra.tests.pageobjects.IFreetextFilter;
import org.nzbhydra.tests.pageobjects.ILink;
import org.nzbhydra.tests.pageobjects.INumberRangeFilter;
import org.nzbhydra.tests.pageobjects.ISelectionButton;
import org.nzbhydra.tests.pageobjects.Link;
import org.nzbhydra.tests.pageobjects.NumberRangeFilter;
import org.nzbhydra.tests.pageobjects.SearchPO;
import org.nzbhydra.tests.pageobjects.SearchResultsPO;
import org.nzbhydra.tests.pageobjects.SelectionButton;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriverService;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.popper.fw.element.ICheckbox;
import org.popper.fw.interfaces.IPoFactory;
import org.popper.fw.webdriver.DefaultWebdriverConfig;
import org.popper.fw.webdriver.WebdriverContext;
import org.springframework.test.context.junit4.SpringRunner;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;


@RunWith(SpringRunner.class)
@NzbhydraMockMvcTest
public class SearchingResultsUiTest extends AbstractConfigReplacingTest {

    private final static String PHANTJOMJS = "c:\\programme\\phantomjs-2.1.1-windows\\bin\\phantomjs.exe";
    private final static String CHROMEDRIVER = "c:\\programme\\chromedriver\\chromedriver.exe";
    private IPoFactory factory;

    private MockWebServer mockWebServer = new MockWebServer();
    WebDriver webDriver = null;
    String url = null;

    @Before
    public void setUp() throws IOException {
        mockWebServer.start(7070);
        System.setProperty("disableBlockUi", "true");
        initializePhantomJs();
        //initializeChromeDriver();

        prepareFiveResultsFromTwoIndexers();
        url = "http://127.0.0.1:5077";
        WebdriverContext context = new WebdriverContext();
        context.setConfig(new WebdriverConfig(webDriver, url));
        //TODO Collect automatically ?
        context.getDefaultElementFactory().addImplClassForElement(IColumnSortable.class, ColumnSortable.class);
        context.getDefaultElementFactory().addImplClassForElement(IFreetextFilter.class, FreetextFilter.class);
        context.getDefaultElementFactory().addImplClassForElement(ICheckboxFilter.class, CheckboxFilter.class);
        context.getDefaultElementFactory().addImplClassForElement(INumberRangeFilter.class, NumberRangeFilter.class);
        context.getDefaultElementFactory().addImplClassForElement(ISelectionButton.class, SelectionButton.class);
        context.getDefaultElementFactory().addImplClassForElement(ICheckBox.class, CheckBox.class);
        context.getDefaultElementFactory().addImplClassForElement(ILink.class, Link.class);
        factory = context.getFactory();
    }


    protected void initializeChromeDriver() {
        System.setProperty("webdriver.chrome.driver", CHROMEDRIVER);
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
    public void testSearchInput() throws Exception {
        SearchPO searchPage = factory.createPage(SearchPO.class);
        searchPage.open();

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("searchfield")));

        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).as("Should be preselected").isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).as("Should not be preselected").isFalse();

        searchPage.indexerSelectionButton().invertSelection();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isTrue();
        searchPage.indexerSelectionButton().deselectAll();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isFalse();
        searchPage.indexerSelectionButton().selectAll();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isTrue();

        searchPage.categoryToggleButton().click();
        searchPage.categoryOptions().stream().filter(x -> x.text().equals("Anime")).findFirst().get().click();
        assertThat(searchPage.indexerSelectionCheckboxes().stream().map(x -> x.getAttribute("indexer-name")).collect(Collectors.toList())).as("Should've removed mock2 because it's not enabled for Anime category").containsExactly("mock1");
        searchPage.categoryToggleButton().click();
        searchPage.categoryOptions().stream().filter(x -> x.text().equals("Movies")).findFirst().get().click();
        assertThat(searchPage.indexerSelectionCheckboxes().stream().map(x -> x.getAttribute("indexer-name")).collect(Collectors.toList())).containsExactly("mock1", "mock2");
    }

    @Test
    public void testSearchResults() throws Exception {
        webDriver.get(url + "/?category=All&query=uitest&mode=search&indexers=mock1%252Cmock2");

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("search-results-table")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        assertThat(searchResultsPage.searchResultRows().size()).isEqualTo(5);
        assertThat(searchResultsPage.titles()).containsExactly("indexer1-result1", "indexer1-result2", "indexer1-result3", "indexer2-result1", "indexer2-result2");

        checkSortAndFilter(searchResultsPage);

        searchResultsPage.searchResultSelectionButton().selectAll();
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).isEqualTo(5L);
        searchResultsPage.indexerSelectionCheckboxes().get(0).uncheck();
        searchResultsPage.searchResultSelectionButton().invertSelection();
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).isEqualTo(1L);
        searchResultsPage.searchResultSelectionButton().deselectAll();
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).isEqualTo(0L);

        searchResultsPage.tableHeader().titleHeader().sortAscending();
        assertThat(searchResultsPage.searchResultRows().get(0).showNfoButton().getAttribute("class")).contains("no-nfo");
        assertThat(searchResultsPage.searchResultRows().get(1).showNfoButton().isDisplayed()).isTrue();

        assertThat(searchResultsPage.searchResultRows().get(0).downloadNzbLink().href()).contains("/getnzb/user/");
    }

    protected void checkSortAndFilter(SearchResultsPO searchResultsPage) {
        searchResultsPage.tableHeader().titleHeader().sortAscending();
        assertThat(searchResultsPage.titles()).containsExactly("indexer1-result1", "indexer1-result2", "indexer1-result3", "indexer2-result1", "indexer2-result2");
        searchResultsPage.tableHeader().titleHeader().sortDescending();
        assertThat(searchResultsPage.titles()).containsExactly("indexer2-result2", "indexer2-result1", "indexer1-result3", "indexer1-result2", "indexer1-result1");

        searchResultsPage.tableHeader().indexerHeader().sortAscending();
        assertThat(searchResultsPage.titles()).containsExactly("indexer1-result1", "indexer1-result2", "indexer1-result3", "indexer2-result1", "indexer2-result2");
        searchResultsPage.tableHeader().indexerHeader().sortDescending();
        assertThat(searchResultsPage.titles()).containsExactly("indexer2-result2", "indexer2-result1", "indexer1-result3", "indexer1-result2", "indexer1-result1");

        searchResultsPage.tableHeader().categoryHeader().sortDescending();
        assertThat(searchResultsPage.categories()).containsExactly("TV SD", "TV HD", "TV", "Movies HD", "Movies");
        searchResultsPage.tableHeader().categoryHeader().sortAscending();
        assertThat(searchResultsPage.categories()).containsExactly("Movies", "Movies HD", "TV", "TV HD", "TV SD");

        searchResultsPage.tableHeader().sizeHeader().sortDescending();
        assertThat(searchResultsPage.sizes()).containsExactly("5 MB", "4 MB", "3 MB", "2 MB", "1 MB");
        searchResultsPage.tableHeader().sizeHeader().sortAscending();
        assertThat(searchResultsPage.sizes()).containsExactly("1 MB", "2 MB", "3 MB", "4 MB", "5 MB");

        searchResultsPage.tableHeader().grabsHeader().sortDescending();
        assertThat(searchResultsPage.grabs()).containsExactly("5", "4", "3", "2", "1");
        searchResultsPage.tableHeader().grabsHeader().sortAscending();
        assertThat(searchResultsPage.grabs()).containsExactly("1", "2", "3", "4", "5");

        searchResultsPage.tableHeader().ageHeader().sortDescending();
        assertThat(searchResultsPage.ages()).containsExactly("5d", "4d", "3d", "2d", "1d");
        searchResultsPage.tableHeader().ageHeader().sortAscending();
        assertThat(searchResultsPage.ages()).containsExactly("1d", "2d", "3d", "4d", "5d");

        searchResultsPage.tableHeader().titleFilter().filterBy("indexer1");
        assertThat(searchResultsPage.titles()).containsExactlyInAnyOrder("indexer1-result1", "indexer1-result2", "indexer1-result3");
        searchResultsPage.tableHeader().titleFilter().clear();
        assertThat(searchResultsPage.titles()).containsExactlyInAnyOrder("indexer1-result1", "indexer1-result2", "indexer1-result3", "indexer2-result1", "indexer2-result2");

        searchResultsPage.tableHeader().indexerFilter().filterBy(Arrays.asList("mock1"));
        assertThat(searchResultsPage.titles()).containsExactlyInAnyOrder("indexer1-result1", "indexer1-result2", "indexer1-result3");
        searchResultsPage.tableHeader().indexerFilter().selectAll();
        assertThat(searchResultsPage.titles()).containsExactlyInAnyOrder("indexer1-result1", "indexer1-result2", "indexer1-result3", "indexer2-result1", "indexer2-result2");

        searchResultsPage.tableHeader().categoryFilter().filterBy(Arrays.asList("Movies", "TV HD"));
        assertThat(searchResultsPage.categories()).containsExactlyInAnyOrder("Movies", "TV HD");
        searchResultsPage.tableHeader().categoryFilter().selectAll();
        assertThat(searchResultsPage.categories()).containsExactlyInAnyOrder("Movies", "Movies HD", "TV", "TV HD", "TV SD");

        searchResultsPage.tableHeader().sizeFilter().filterBy(2, 4);
        assertThat(searchResultsPage.sizes()).containsExactlyInAnyOrder("2 MB", "3 MB", "4 MB");
        searchResultsPage.tableHeader().sizeFilter().clear();
        assertThat(searchResultsPage.sizes()).containsExactlyInAnyOrder("1 MB", "2 MB", "3 MB", "4 MB", "5 MB");

        searchResultsPage.tableHeader().grabsFilter().filterBy(2, 4);
        assertThat(searchResultsPage.grabs()).containsExactlyInAnyOrder("2", "3", "4");
        searchResultsPage.tableHeader().grabsFilter().clear();
        assertThat(searchResultsPage.grabs()).containsExactlyInAnyOrder("5", "4", "3", "2", "1");

        searchResultsPage.tableHeader().ageFilter().filterBy(2, 4);
        assertThat(searchResultsPage.ages()).containsExactlyInAnyOrder("2d", "3d", "4d");
        searchResultsPage.tableHeader().ageFilter().clear();
        assertThat(searchResultsPage.ages()).containsExactlyInAnyOrder("1d", "2d", "3d", "4d", "5d");
    }

    protected void prepareFiveResultsFromTwoIndexers() throws IOException {
        replaceConfig(getClass().getResource("twoIndexers.json"));

        mockWebServer.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) throws InterruptedException {
                if (request.getRequestUrl().queryParameter("apikey").equals("apikey1")) {
                    RssItem result1 = RssItemBuilder.builder("indexer1-result1").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).hasNfo(false).grabs(1).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").build();
                    RssItem result2 = RssItemBuilder.builder("indexer1-result2").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).hasNfo(true).grabs(2).size(mbToBytes(2)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5040")))).category("TV SD").build();
                    RssItem result3 = RssItemBuilder.builder("indexer1-result3").pubDate(Instant.now().minus(3, ChronoUnit.DAYS)).comments("comments").grabs(3).size(mbToBytes(3)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5030")))).category("TV HD").build();
                    RssRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result1, result2, result3), 0, 3);
                    return new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8");
                } else if (request.getRequestUrl().queryParameter("apikey").equals("apikey2")) {
                    RssItem result4 = RssItemBuilder.builder("indexer2-result1").pubDate(Instant.now().minus(4, ChronoUnit.DAYS)).grabs(4).size(mbToBytes(4)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2000")))).category("Movies").build();
                    RssItem result5 = RssItemBuilder.builder("indexer2-result2").pubDate(Instant.now().minus(5, ChronoUnit.DAYS)).grabs(5).size(mbToBytes(5)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2040")))).category("Movies HD").build();
                    RssRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result4, result5), 0, 2);
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