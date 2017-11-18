package org.nzbhydra.tests.pageobjects;

import org.nzbhydra.misc.Sleep;
import org.openqa.selenium.By;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class SelectionButton extends AbstractWebElement implements ISelectionButton {

    public SelectionButton(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void selectAll() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        Sleep.sleep(100);
        getWebelement().findElement(By.className("selection-button-select-all")).click();
    }

    @Override
    public void deselectAll() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        Sleep.sleep(100);
        getWebelement().findElement(By.className("selection-button-deselect-all")).click();

    }

    @Override
    public void invertSelection() {
        getWebelement().findElement(By.className("selection-button-invert-selection")).click();
    }


}
