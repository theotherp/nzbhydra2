package org.nzbhydra.tests.pageobjects;

import org.openqa.selenium.By;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class SelectionButton extends AbstractWebElement implements ISelectionButton {

//    @Locator(cssSelector = ".election-button-invert-selection")
//    abstract IButton invertSelectionButton();
//
//    @Locator(cssSelector = ".selection-button-toggle-dropdown")
//    abstract IButton indexerSelectionDropdown();
//
//    @Locator(cssSelector = ".selection-button-select-all")
//    abstract ILink selectAllButton();
//
//    @Locator(cssSelector = "selection-button-deselect-all")
//    abstract ILink deselectAllButton();


    public SelectionButton(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void selectAll() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        getWebelement().findElement(By.className("selection-button-select-all")).click();
    }

    @Override
    public void deselectAll() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        getWebelement().findElement(By.className("selection-button-deselect-all")).click();

    }

    @Override
    public void invertSelection() {
        getWebelement().findElement(By.className("selection-button-invert-selection")).click();
    }


}
