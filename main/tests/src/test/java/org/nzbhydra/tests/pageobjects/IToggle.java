package org.nzbhydra.tests.pageobjects;

import org.popper.fw.webdriver.elements.IWebElement;

public interface IToggle extends IWebElement {

    void click();
    boolean isVisible();
}
