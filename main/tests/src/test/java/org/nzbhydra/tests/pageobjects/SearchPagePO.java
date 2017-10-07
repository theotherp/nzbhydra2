package org.nzbhydra.tests.pageobjects;

import org.popper.fw.annotations.Page;
import org.popper.fw.element.IButton;
import org.popper.fw.element.ICheckbox;
import org.popper.fw.element.ILabel;
import org.popper.fw.element.ILink;
import org.popper.fw.element.ITextBox;
import org.popper.fw.webdriver.annotations.PageAccessor;
import org.popper.fw.webdriver.annotations.locator.Locator;

import java.util.List;

@Page
public interface SearchPagePO {
    @PageAccessor(uri = "/")
    public void open();

    @Locator(id = "searchCategoryDropdownButton")
    IButton categoryToggleButton();

    @Locator(cssSelector = ".search-category-option")
    List<ILink> categoryOptions();

    @Locator(id = "by-id")
    ICheckbox byIdCheckbox();

    @Locator(id = "clear-autocomplete-button")
    IButton clearAutocompleteButton();

    @Locator(id = "selected-item-title")
    ILabel selectedItemTitle();

    @Locator(id = "seriesSearchS")
    ITextBox seasonField();

    @Locator(id = "seriesSearchE")
    ITextBox episodeField();

    @Locator(id = "searchfield")
    ITextBox searchField();

    @Locator(id = "history-dropdown-button")
    IButton historyDropdownButton();

    @Locator(cssSelector = ".search-history-dropdown-entry")
    List<ILink> searchHistoryEntries();

    @Locator(id = "startsearch")
    IButton goButton();

    @Locator(id = "invert-indexers-selection-button")
    IButton invertSelection();

    @Locator(id = "indexer-selection-dropdown")
    IButton indexerSelectionDropdown();

    @Locator(id = "select-all-indexers-button")
    ILink selectAll();

    @Locator(id = "deselect-all-indexers-button")
    ILink deselectAll();

    @Locator(cssSelector = ".indexer-selection-checkbox")
    List<ICheckbox> indexerSelectionCheckboxes();


}
