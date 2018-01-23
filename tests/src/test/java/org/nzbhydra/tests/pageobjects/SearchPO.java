package org.nzbhydra.tests.pageobjects;

import org.popper.fw.annotations.Page;
import org.popper.fw.element.IButton;
import org.popper.fw.element.ILabel;
import org.popper.fw.element.ILink;
import org.popper.fw.element.ITextBox;
import org.popper.fw.webdriver.annotations.PageAccessor;
import org.popper.fw.webdriver.annotations.locator.Locator;

import java.util.List;


@Page
public interface SearchPO {
    @PageAccessor(uri = "/")
    public  void open();

    @Locator(id = "searchCategoryDropdownButton")
    public  IButton categoryDropdownButton();

    @Locator(cssSelector = ".search-category-option")
    public  List<ILink> categoryOptions();

    @Locator(id = "by-id")
    public ICheckBox byIdCheckbox();

    @Locator(id = "clear-autocomplete-button")
    public  IButton clearAutocompleteButton();

    @Locator(id = "selected-item-title")
    public  ILabel selectedItemTitle();

    @Locator(id = "seriesSearchS")
    public  ITextBox seasonField();

    @Locator(id = "seriesSearchE")
    public  ITextBox episodeField();

    @Locator(id = "searchfield")
    public  ITextBox searchField();

    @Locator(id = "history-dropdown-button")
    public  IButton historyDropdownButton();

    @Locator(cssSelector = ".search-history-dropdown-entry")
    public  List<ILink> searchHistoryEntries();

    @Locator(id = "startsearch")
    public  IButton goButton();

    @Locator(cssSelector = ".indexer-selection-button")
    public  IIndexerSelectionButton indexerSelectionButton();

    @Locator(cssSelector = ".indexer-selection-checkbox")
    public  List<ICheckBox> indexerSelectionCheckboxes();


}
