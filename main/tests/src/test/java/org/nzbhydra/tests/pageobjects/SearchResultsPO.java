package org.nzbhydra.tests.pageobjects;

import org.popper.fw.annotations.Page;
import org.popper.fw.element.IButton;
import org.popper.fw.element.ICheckbox;
import org.popper.fw.element.ILabel;
import org.popper.fw.element.ILink;
import org.popper.fw.webdriver.annotations.locator.Locator;

import java.util.List;

@Page
public interface SearchResultsPO {

    @Locator(id = "show-duplicates-checkbox")
    ICheckbox showDuplicatesCheckbox();

    @Locator(id = "invert-selection-button")
    IButton invertSelection();

    @Locator(id = "result-selection-dropdown")
    IButton resultSelectionDropdown();

    @Locator(id = "select-all-button")
    ILink selectAll();

    @Locator(id = "deselect-all-button")
    ILink deselectAll();


    @Locator(id = "send-selected-to-downloader")
    IButton sendSelectedToDownloaderButton();

    @Locator(id = "send-selected-to-downloader-dropdown")
    IButton sendSelectedToDownloaderDropdown();

    @Locator(cssSelector = ".send-to-downloader")
    List<ILink> sendToDownloaderButtons();

    @Locator(cssSelector = ".search-results-header-row")
    TableHeader tableHeader();

    @Locator(cssSelector = ".search-results-row")
    List<SearchResultRow> searchResultRows();

    public abstract class TableHeader {

        @Locator(cssSelector = ".column-sortable-title")
        public abstract IColumnSortable titleHeader();

        @Locator(cssSelector =".search-results-header-row .result-title .filter-wrapper")
        public abstract IFreetextFilter titleFilter();

        @Locator(cssSelector = ".column-sortable-indexer")
        public abstract IColumnSortable indexerHeader();

        @Locator(cssSelector = ".column-sortable-category")
        public abstract IColumnSortable categoryHeader();

        @Locator(cssSelector = ".column-sortable-size")
        public abstract IColumnSortable sizeHeader();

        @Locator(cssSelector = ".column-sortable-grabs")
        public abstract IColumnSortable grabsHeader();

        @Locator(cssSelector = ".column-sortable-age")
        public abstract IColumnSortable ageHeader();


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
        ILabel details();

        @Locator(cssSelector = ".result-age")
        ILabel age();

        @Locator(cssSelector = ".result-show-nfo-link")
        ILink showNfoButton();

        @Locator(cssSelector = ".result-comments-link")
        ILink commentsLink();

        @Locator(cssSelector = ".result-details-link")
        ILink detailsLink();

        @Locator(cssSelector = ".result-torrent-download-link")
        ILink downloadTorrentLink();

        @Locator(cssSelector = ".result-nzb-download-link")
        ILink downloadNzbLink();

        @Locator(cssSelector = ".result-send-to-downloader-link")
        List<ILink> sendToDownloaderButtons();


    }
}
