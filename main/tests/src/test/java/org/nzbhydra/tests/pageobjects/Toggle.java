package org.nzbhydra.tests.pageobjects;

import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class Toggle extends AbstractWebElement implements IToggle{
    public Toggle(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void click() {
        getWebelement().click();
    }

    @Override
    public boolean isVisible() {
        return getWebelement().isDisplayed();
    }
}
