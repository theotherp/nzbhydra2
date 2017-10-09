package org.nzbhydra.tests.pageobjects;

import org.popper.fw.annotations.Page;
import org.popper.fw.element.IButton;
import org.popper.fw.element.ICheckbox;
import org.popper.fw.element.ILabel;
import org.popper.fw.webdriver.annotations.locator.Locator;

import java.util.List;
import java.util.stream.Collectors;

@Page
public abstract class SearchResultsPO {

    @Locator(id = "show-duplicates-checkbox")
    public abstract ICheckbox showDuplicatesCheckbox();

    @Locator(id = "search-results-selection-button")
    public abstract ISelectionButton searchResultSelectionButton();

    @Locator(id = "send-selected-to-downloader")
    public abstract IButton sendSelectedToDownloaderButton();

    @Locator(id = "send-selected-to-downloader-dropdown")
    public abstract IButton sendSelectedToDownloaderDropdown();

    @Locator(cssSelector = ".send-to-downloader")
    public abstract List<ILink> sendToDownloaderButtons();

    @Locator(cssSelector = ".search-results-header-row")
    public abstract TableHeader tableHeader();

    @Locator(cssSelector = ".search-results-row")
    public abstract List<SearchResultRow> searchResultRows();

    @Locator(cssSelector = ".result-checkbox")
    public abstract List<ICheckbox> indexerSelectionCheckboxes();

    public List<String> titles() {
        return searchResultRows().stream().map(x -> x.title().text().trim()).collect(Collectors.toList());
    }

    public List<String> indexers() {
        return searchResultRows().stream().map(x -> x.indexer().text().trim()).collect(Collectors.toList());
    }

    public List<String> categories() {
        return searchResultRows().stream().map(x -> x.category().text().trim()).collect(Collectors.toList());
    }

    public List<String> sizes() {
        return searchResultRows().stream().map(x -> x.size().text().trim()).collect(Collectors.toList());
    }

    public List<String> grabs() {
        return searchResultRows().stream().map(x -> x.grabs().text().trim()).collect(Collectors.toList());
    }

    public List<String> ages() {
        return searchResultRows().stream().map(x -> x.age().text().trim()).collect(Collectors.toList());
    }


    public interface TableHeader {
        @Locator(cssSelector = ".column-sortable-title")
        IColumnSortable titleHeader();

        @Locator(cssSelector = ".search-results-header-row .result-title .filter-wrapper")
        IFreetextFilter titleFilter();

        @Locator(cssSelector = ".column-sortable-indexer")
        IColumnSortable indexerHeader();

        @Locator(cssSelector = ".search-results-header-row .result-indexer .filter-wrapper")
        ICheckboxFilter indexerFilter();

        @Locator(cssSelector = ".column-sortable-category")
        IColumnSortable categoryHeader();

        @Locator(cssSelector = ".search-results-header-row .result-category .filter-wrapper")
        ICheckboxFilter categoryFilter();

        @Locator(cssSelector = ".column-sortable-size")
        IColumnSortable sizeHeader();

        @Locator(cssSelector = ".search-results-header-row .result-size .filter-wrapper")
        INumberRangeFilter sizeFilter();

        @Locator(cssSelector = ".column-sortable-grabs")
        IColumnSortable grabsHeader();

        @Locator(cssSelector = ".search-results-header-row .result-details .filter-wrapper")
        INumberRangeFilter grabsFilter();

        @Locator(cssSelector = ".column-sortable-epoch")
        IColumnSortable ageHeader();

        @Locator(cssSelector = ".search-results-header-row .result-age .filter-wrapper")
        INumberRangeFilter ageFilter();

    }

    public interface SearchResultRow {
        //Later Support for duplicate rows

        @Locator(cssSelector = ".result-title")
        ILabel title();

        @Locator(cssSelector = ".result-indexer")
        ILabel indexer();

        @Locator(cssSelector = ".result-category")
        ILabel category();

        @Locator(cssSelector = ".result-size")
        ILabel size();

        @Locator(cssSelector = ".result-details")
        ILabel grabs();

        @Locator(cssSelector = ".result-age")
        ILabel age();

        @Locator(cssSelector = ".result-show-nfo-link")
        org.nzbhydra.tests.pageobjects.ILink  showNfoButton();

        @Locator(cssSelector = ".result-comments-link")
        org.nzbhydra.tests.pageobjects.ILink  commentsLink();

        @Locator(cssSelector = ".result-details-link")
        org.nzbhydra.tests.pageobjects.ILink  detailsLink();

        @Locator(cssSelector = ".result-torrent-download-link")
        org.nzbhydra.tests.pageobjects.ILink  downloadTorrentLink();

        @Locator(cssSelector = ".result-nzb-download-link")
        org.nzbhydra.tests.pageobjects.ILink  downloadNzbLink();

        @Locator(cssSelector = ".result-send-to-downloader-link")
        List<org.nzbhydra.tests.pageobjects.ILink > sendToDownloaderButtons();


    }
}
