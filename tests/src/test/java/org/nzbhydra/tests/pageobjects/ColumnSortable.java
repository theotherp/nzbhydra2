package org.nzbhydra.tests.pageobjects;

import org.nzbhydra.misc.Sleep;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

import java.util.List;

public class ColumnSortable extends AbstractWebElement implements IColumnSortable {

    public ColumnSortable(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void toggleSort() {
        if (isSorted()) {
            getElement().findElement(By.className("marker-sortable")).click();
        } else {
            getElement().findElement(By.className("text-sortable")).click();
        }
    }

    @Override
    public void sortAscending() {
        if (!isSorted() || !isSortedAscending()) {
            toggleSort();
        }
        Sleep.sleep(100);
        if (!isSortedAscending()) {
            toggleSort();
        }
        Sleep.sleep(100);
        if (!isSortedAscending()) {
            throw new RuntimeException("Unable to sort ascending");
        }
    }

    @Override
    public void sortDescending() {
        if (!isSorted() || !isSortedDescending()) {
            toggleSort();
        }
        Sleep.sleep(100);
        if (!isSortedDescending()) {
            toggleSort();
        }
        Sleep.sleep(100);
        if (!isSortedDescending()) {
            toggleSort();
        }
        Sleep.sleep(100);
        if (!isSortedDescending()) {
            throw new RuntimeException("Unable to sort descending");
        }
    }

    public boolean isSorted() {
        return isSortedAscending() || isSortedDescending();
    }

    public boolean isSortedAscending() {
        List<WebElement> elements = getElement().findElements(By.cssSelector(".marker-sortable.glyphicon-triangle-top"));
        if (elements.isEmpty()) {
            return false;
        }
        return elements.get(0).isDisplayed();
    }

    public boolean isSortedDescending() {
        List<WebElement> elements = getElement().findElements(By.cssSelector(".marker-sortable.glyphicon-triangle-bottom"));
        if (elements.isEmpty()) {
            return false;
        }
        return elements.get(0).isDisplayed();
    }

}
