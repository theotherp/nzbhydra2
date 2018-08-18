package org.nzbhydra.tests.searching;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.mockwebserver.Dispatcher;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.config.IndexerConfigBuilder;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.downloading.FileZipResponse;
import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.misc.Sleep;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.tests.AbstractConfigReplacingTest;
import org.nzbhydra.tests.NzbhydraMockMvcTest;
import org.nzbhydra.tests.pageobjects.*;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.popper.fw.element.ICheckbox;
import org.popper.fw.interfaces.IPoFactory;
import org.popper.fw.webdriver.DefaultWebdriverConfig;
import org.popper.fw.webdriver.WebdriverContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;

import java.io.IOException;
import java.nio.charset.Charset;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;


@SuppressWarnings("SpringJavaInjectionPointsAutowiringInspection")
@RunWith(SpringRunner.class)
@NzbhydraMockMvcTest
@TestPropertySource(locations = "classpath:config/application.properties")
public class SearchingResultsUiTest extends AbstractConfigReplacingTest {

    private IPoFactory factory;

    private MockWebServer mockWebServer = new MockWebServer();
    @Autowired
    WebDriver webDriver;
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
        WebdriverContext context = new WebdriverContext();
        context.setConfig(new WebdriverConfig(webDriver, url));
        context.getDefaultElementFactory().addImplClassForElement(IColumnSortable.class, ColumnSortable.class);
        context.getDefaultElementFactory().addImplClassForElement(IFreetextFilter.class, FreetextFilter.class);
        context.getDefaultElementFactory().addImplClassForElement(ICheckboxFilter.class, CheckboxFilter.class);
        context.getDefaultElementFactory().addImplClassForElement(INumberRangeFilter.class, NumberRangeFilter.class);
        context.getDefaultElementFactory().addImplClassForElement(ISelectionButton.class, SelectionButton.class);
        context.getDefaultElementFactory().addImplClassForElement(IDropdownCheckboxButton.class, DropdownCheckboxButton.class);
        context.getDefaultElementFactory().addImplClassForElement(IIndexerSelectionButton.class, IndexerSelectionButton.class);
        context.getDefaultElementFactory().addImplClassForElement(ICheckBox.class, CheckBox.class);
        context.getDefaultElementFactory().addImplClassForElement(ILink.class, Link.class);
        context.getDefaultElementFactory().addImplClassForElement(IToggle.class, Toggle.class);
        factory = context.getFactory();
    }




    @After
    public void tearDown() throws IOException {
        mockWebServer.close();
        try {
            webDriver.quit();
        } catch (Exception e) {
            //NOP, may catch UnsatisfiedLinkError
        }
    }

    @Test
    public void testSearchInput() throws Exception {
        replaceConfig(getClass().getResource("threeIndexersForSearchInputTests.json"));

        SearchPO searchPage = factory.createPage(SearchPO.class);
        searchPage.open();

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("searchfield")));

        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).as("Should be preselected").isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).as("Should not be preselected").isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).as("Should not be preselected").isFalse();

        searchPage.indexerSelectionButton().invertSelection();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).isTrue();
        searchPage.indexerSelectionButton().deselectAll();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).isFalse();
        searchPage.indexerSelectionButton().selectAll();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).isTrue();
        searchPage.indexerSelectionButton().reset();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).isFalse();
        searchPage.indexerSelectionButton().selectAllUsenet();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isTrue();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).isFalse();
        searchPage.indexerSelectionButton().selectAllTorrent();
        assertThat(searchPage.indexerSelectionCheckboxes().get(0).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(1).ischecked()).isFalse();
        assertThat(searchPage.indexerSelectionCheckboxes().get(2).ischecked()).isTrue();

        searchPage.categoryDropdownButton().click();
        searchPage.categoryOptions().stream().filter(x -> x.text().equals("Anime")).findFirst().get().click();
        assertThat(searchPage.categoryDropdownButton().text()).isEqualTo("Anime");
        assertThat(searchPage.indexerSelectionCheckboxes().stream().map(x -> x.getAttribute("indexer-name")).collect(Collectors.toList())).as("Should've removed mock2 because it's not enabled for Anime category").containsExactly("mock1", "mock3");
        searchPage.categoryDropdownButton().click();
        searchPage.categoryOptions().stream().filter(x -> x.text().equals("Movies")).findFirst().get().click();
        assertThat(searchPage.indexerSelectionCheckboxes().stream().map(x -> x.getAttribute("indexer-name")).collect(Collectors.toList())).containsExactly("mock1", "mock2", "mock3");
    }

    @Test
    @Ignore //Doesn't run properly on CircleCI
    public void testSearchResults() throws Exception {
        SearchResultsPO searchResultsPage = prepareAndOpenSearchResultsPage();

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

    @Test
    public void testSearchResultsSelection() throws Exception {
        SearchResultsPO searchResultsPage = prepareAndOpenSearchResultsPage();

        //Test multi-selection boxes
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

        //Test deselection of results when hiding or downloading them
        searchResultsPage.searchResultSelectionButton().deselectAll();
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).describedAs("Deselected").isEqualTo(0L);
        Actions shiftClick = new Actions(webDriver);
        shiftClick.click(searchResultsPage.indexerSelectionCheckboxes().get(0).getWebelement()).keyDown(Keys.SHIFT).click(searchResultsPage.indexerSelectionCheckboxes().get(4).getWebelement()).keyUp(Keys.SHIFT).perform();
        Sleep.sleep(100);
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).isEqualTo(5L);
        searchResultsPage.downloadSelectedAsZipButton().click();
        Sleep.sleep(1000);
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).describedAs("After download as zip").isEqualTo(0L);
        searchResultsPage.searchResultSelectionButton().selectAll();
        searchResultsPage.tableHeader().indexerFilter().filterBy(Arrays.asList("mock1"));
        searchResultsPage.tableHeader().indexerFilter().filterBy(Arrays.asList("mock1"));
        Sleep.sleep(100);
        searchResultsPage.tableHeader().indexerFilter().selectAll();
        assertThat(searchResultsPage.indexerSelectionCheckboxes().stream().filter(ICheckbox::ischecked).count()).isEqualTo(3L);
    }

    protected SearchResultsPO prepareAndOpenSearchResultsPage() throws Exception {
        prepareFiveResultsFromTwoIndexers();
        webDriver.get(url + "/?category=All&query=uitest&mode=search&indexers=mock1%252Cmock2");

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("search-results-table")));

        SearchPO searchPO = factory.createPage(SearchPO.class);
        Sleep.sleep(500);
        searchPO.historyDropdownButton().click();
        List<org.popper.fw.element.ILink> historyEntries = searchPO.searchHistoryEntries();
        assertThat(historyEntries.size()).isEqualTo(1);
        assertThat(historyEntries.get(0).text()).isEqualTo("Category: All, Query: uitest");

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        assertThat(searchResultsPage.searchResultRows().size()).isEqualTo(5);
        assertThat(searchResultsPage.titles()).containsExactlyInAnyOrder("indexer1-result1", "indexer1-result2", "indexer1-result3", "indexer2-result1", "indexer2-result2");
        return searchResultsPage;
    }

    @Test
    public void testRepeatSearch() throws Exception {
        prepareFiveResultsFromTwoIndexers();
        SearchEntity entity = new SearchEntity();
        entity.setQuery("uitest");
        entity.setCategoryName("All");
        entity.setSource(SearchSource.INTERNAL);
        searchRepository.save(entity);
        webDriver.get(url);

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("history-dropdown-button")));

        SearchPO searchPO = factory.createPage(SearchPO.class);
        searchPO.historyDropdownButton().click();
        List<org.popper.fw.element.ILink> historyEntries = searchPO.searchHistoryEntries();
        assertThat(historyEntries.size()).isEqualTo(1);
        assertThat(historyEntries.get(0).text()).isEqualTo("Category: All, Query: uitest");
        historyEntries.get(0).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("search-results-table")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        //Only indexer1 was preselected and that's the one used for the repeated search

        assertThat(searchResultsPage.searchResultRows().size()).isEqualTo(3);
        assertThat(searchResultsPage.titles()).containsExactlyInAnyOrder("indexer1-result1", "indexer1-result2", "indexer1-result3");
    }

    @Test
    public void testSearchResultsDuplicatesAndTitleGroups() throws Exception {
        prepareDuplicateAndTitleGroupedResults();
        webDriver.get(url + "/?category=All&query=uitest&mode=search&indexers=mock1%252Cmock2");

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.className("search-results-table")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        searchResultsPage.tableHeader().ageHeader().sortAscending();

        //Make sure duplicates are hidden
        String displayTriggers = "Show duplicate display triggers";
        if (searchResultsPage.displayOptions().isSelected(displayTriggers)) {
            searchResultsPage.displayOptions().deselect(displayTriggers);
        }

        assertThat(searchResultsPage.titleGroupToggles().size()).isEqualTo(2).as("Duplicates should be hidden");
        assertThat(searchResultsPage.titleGroupToggles().get(0).isVisible()).isFalse();
        assertThat(searchResultsPage.titleGroupToggles().get(1).isVisible()).isTrue();
        assertThat(searchResultsPage.titles().size()).isEqualTo(2);

        //Expand "grouptitle"
        searchResultsPage.titleGroupToggles().get(1).click();
        assertThat(searchResultsPage.titles().size()).isEqualTo(3);
        assertThat(searchResultsPage.titles().get(2)).as("Titles in title groups shouldn't be shown").isNullOrEmpty();
        searchResultsPage.titleGroupToggles().get(1).click();
        assertThat(searchResultsPage.titles().size()).isEqualTo(2);

        //Show duplicates
        assertThat(searchResultsPage.duplicateGroupToggles().size()).as("Duplicate toggle buttons should not exist").isEqualTo(0);
        searchResultsPage.displayOptions().select(displayTriggers);
        assertThat(searchResultsPage.duplicateGroupToggles().size()).as("Duplicate toggle buttons should exist").isEqualTo(2);
        assertThat(searchResultsPage.duplicateGroupToggles().get(0).isVisible()).as("A duplicate buttom should be visible for the duplicates").isTrue();
        assertThat(searchResultsPage.duplicateGroupToggles().get(1).isVisible()).as("No duplicate buttom should be visible for the titlegroup").isFalse();
        //Expand duplicates
        Sleep.sleep(100);
        searchResultsPage.duplicateGroupToggles().get(0).click();
        Sleep.sleep(100);
        assertThat(searchResultsPage.titles().size()).isEqualTo(3);
        assertThat(searchResultsPage.titles().get(1)).as("Duplicates' titles shouldn't be shown").isNullOrEmpty();
        //Collapse duplicates
        searchResultsPage.duplicateGroupToggles().get(0).click();
        Sleep.sleep(100);
        assertThat(searchResultsPage.titles().size()).isEqualTo(2);
        //Expand and then disable duplicates
        searchResultsPage.duplicateGroupToggles().get(0).click();
        Sleep.sleep(100);
        assertThat(searchResultsPage.titles().size()).isEqualTo(3);
        searchResultsPage.displayOptions().deselect(displayTriggers);
        Sleep.sleep(100);
        assertThat(searchResultsPage.titles().size()).as("Unchecking duplicates should collapse all duplicate groups").isEqualTo(2);

        //Sort when title group expanded
        searchResultsPage.titleGroupToggles().get(1).click();
        Sleep.sleep(100);
        searchResultsPage.tableHeader().titleHeader().sortAscending();
        assertThat(searchResultsPage.titles().size()).as("Changing the sort predicate should keep the title groups expanded").isEqualTo(3);
        assertThat(searchResultsPage.titles()).containsExactly("duplicate", "grouptitle", "");
        assertThat(searchResultsPage.ages()).containsExactly("1d", "2d", "3d").as("Sorting by title should sort the title group internally by age ascending");

        //Check sorting inside title group
        searchResultsPage.tableHeader().ageHeader().sortDescending();
        assertThat(searchResultsPage.ages()).containsExactly("3d", "2d", "1d").as("Title groups should be sorted internally as well");
        searchResultsPage.tableHeader().ageHeader().sortAscending();
        assertThat(searchResultsPage.ages()).containsExactly("1d", "2d", "3d").as("Title groups should be sorted internally as well");
    }

    @Test
    public void testMessageIfNoResults() throws Exception {
        replaceIndexers(Arrays.asList(IndexerConfigBuilder.builder().build()));
        NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(), 0, 0);
        mockWebServer.enqueue(new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webDriver.get(url + "/?category=All&query=uitest&mode=search");

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("no-search-results")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        assertThat(searchResultsPage.noSearchResultsWarning().text()).isEqualTo("No results were found for this search");
        assertThat(webDriver.findElements(By.className("search-results-table")).isEmpty()).isTrue();
    }

    @Test
    public void testMessageIfAllResultsRejected() throws Exception {
        replaceIndexers(Arrays.asList(IndexerConfigBuilder.builder().build()));
        baseConfig.getSearching().setRequiredWords(Collections.singletonList("not in there"));
        baseConfig.getSearching().setApplyRestrictions(SearchSourceRestriction.INTERNAL);
        replaceConfig(baseConfig);

        NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(RssItemBuilder.builder("someresult").build()), 0, 1);
        mockWebServer.enqueue(new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8"));
        webDriver.get(url + "/?category=All&query=uitest&mode=search");

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("no-search-results")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        assertThat(searchResultsPage.noSearchResultsWarning().text()).isEqualTo("No (non-rejected) results were found for this search");
        assertThat(webDriver.findElements(By.className("search-results-table")).isEmpty()).isTrue();
    }

    @Test
    public void testMessageIfNoIndexerSuccessful() throws Exception {
        replaceIndexers(Arrays.asList(IndexerConfigBuilder.builder().build()));
        mockWebServer.enqueue(new MockResponse().setResponseCode(400));
        webDriver.get(url + "/?category=All&query=uitest&mode=search");

        WebDriverWait wait = new WebDriverWait(webDriver, 10);
        wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("no-search-results")));

        SearchResultsPO searchResultsPage = factory.createPage(SearchResultsPO.class);
        assertThat(searchResultsPage.noSearchResultsWarning().text()).isEqualTo("Unable to search any indexer successfully; no results available");
        assertThat(webDriver.findElements(By.className("search-results-table")).isEmpty()).isTrue();
    }



    protected void prepareFiveResultsFromTwoIndexers() throws Exception {
        replaceConfig(getClass().getResource("twoIndexers.json"));

        mockWebServer.setDispatcher(new Dispatcher() {
            @Override
            public MockResponse dispatch(RecordedRequest request) throws InterruptedException {
                int mockServerPort = mockWebServer.getPort();
                String mockServerBaseUrl = "http://127.0.0.1:" + mockServerPort + "/";
                if (request.getRequestUrl().queryParameter("apikey") != null && request.getRequestUrl().queryParameter("apikey").equals("apikey1")) {
                    NewznabXmlItem result1 = RssItemBuilder.builder("indexer1-result1").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink1").hasNfo(false).grabs(1).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").build();
                    NewznabXmlItem result2 = RssItemBuilder.builder("indexer1-result2").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink2").hasNfo(true).grabs(2).size(mbToBytes(2)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5040")))).category("TV SD").build();
                    NewznabXmlItem result3 = RssItemBuilder.builder("indexer1-result3").pubDate(Instant.now().minus(3, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink3").comments("comments").grabs(3).size(mbToBytes(3)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5030")))).category("TV HD").build();
                    NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result1, result2, result3), 0, 3);
                    return new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8");
                } else if (request.getRequestUrl().queryParameter("apikey") != null && request.getRequestUrl().queryParameter("apikey").equals("apikey2")) {
                    NewznabXmlItem result5 = RssItemBuilder.builder("indexer2-result2").pubDate(Instant.now().minus(5, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink5").grabs(5).size(mbToBytes(5)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2040")))).category("Movies HD").build();
                    NewznabXmlItem result4 = RssItemBuilder.builder("indexer2-result1").pubDate(Instant.now().minus(4, ChronoUnit.DAYS)).link(mockServerBaseUrl + "nzblink4").grabs(4).size(mbToBytes(4)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2000")))).category("Movies").build();
                    NewznabXmlRoot rssRoot = NewznabMockBuilder.getRssRoot(Arrays.asList(result4, result5), 0, 2);
                    return new MockResponse().setBody(rssRoot.toXmlString()).setHeader("Content-Type", "application/xml; charset=utf-8");
                } else if (request.getPath().endsWith("nzbzip")) {
                    System.out.println("Returning NZB ZIP response");
                    String body = request.getBody().readString(Charset.defaultCharset());
                    ObjectMapper objectMapper = new ObjectMapper();
                    try {
                        List<Long> ids = objectMapper.readValue(body, new TypeReference<List<Long>>() {
                        });
                        FileZipResponse response = new FileZipResponse(true, "bla", null, ids, Collections.emptyList());
                        return new MockResponse().setBody(objectMapper.writeValueAsString(response)).setHeader("Content-Type", "application/xml; charset=utf-8");
                    } catch (IOException e) {


                    }
                    throw new RuntimeException("Unable to handle nzbzip");
                } else if (request.getPath().contains("nzblink")) {
                    System.out.println("Returning NZB");
                    return new MockResponse().setBody("nzb").setHeader("Content-Type", "application/x-nzb; charset=utf-8");
                } else {
                    throw new RuntimeException("Unexpected api key " + request.getRequestUrl().queryParameter("apikey"));
                }
            }
        });
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