package org.nzbhydra.tests.pageobjects;

import org.nzbhydra.misc.Sleep;
import org.openqa.selenium.By;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class NumberRangeFilter extends AbstractWebElement implements INumberRangeFilter {

    public NumberRangeFilter(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void filterBy(Integer min, Integer max) {
        makeVisible();

        if (min != null) {
            getWebelement().findElement(By.className("number-range-filter-min")).sendKeys(min.toString());
        } else {
            getWebelement().findElement(By.className("number-range-filter-min")).clear();
        }
        if (max != null) {
            getWebelement().findElement(By.className("number-range-filter-max")).sendKeys(max.toString());
        } else {
            getWebelement().findElement(By.className("number-range-filter-max")).clear();
        }

        getWebelement().findElement(By.className("number-range-filter-button-apply")).click();
    }

    protected void makeVisible() {
        if (!getWebelement().findElement(By.className("number-range-filter-button-apply")).isDisplayed()) {
            getWebelement().findElement(By.className("toggle-column-filter")).click();
        }
    }

    @Override
    public void clear() {
        makeVisible();
        getWebelement().findElement(By.className("number-range-filter-button-clear")).click();
        Sleep.sleep(200);
    }
}
