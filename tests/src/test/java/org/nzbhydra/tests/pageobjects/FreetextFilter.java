package org.nzbhydra.tests.pageobjects;

import org.nzbhydra.misc.Sleep;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class FreetextFilter extends AbstractWebElement implements IFreetextFilter {

    public FreetextFilter(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void filterBy(String value) {
        if (!getWebelement().findElement(By.id("freetext-filter-input")).isDisplayed()) {
            getWebelement().findElement(By.className("toggle-column-filter")).click();
        }
        getWebelement().findElement(By.id("freetext-filter-input")).sendKeys(value);
        getWebelement().findElement(By.id("freetext-filter-input")).sendKeys(Keys.ENTER);
        Sleep.sleep(100);
    }

    @Override
    public void clear() {
        if (!getWebelement().findElement(By.id("freetext-filter-input")).isDisplayed()) {
            getWebelement().findElement(By.className("toggle-column-filter")).click();
        }
        getWebelement().findElement(By.id("freetext-filter-input")).clear();
        getWebelement().findElement(By.id("freetext-filter-input")).sendKeys(Keys.ENTER);
        Sleep.sleep(100);
    }
}
