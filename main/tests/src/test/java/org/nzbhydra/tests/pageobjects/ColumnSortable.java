package org.nzbhydra.tests.pageobjects;

import org.openqa.selenium.By;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

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
        if (!isSorted()) {
            toggleSort();
        }
        if (!isSortedAscending()) {
            toggleSort();
        }
    }

    @Override
    public void sortDescending() {
        if (!isSorted()) {
            toggleSort();
        }
        if (!isSortedDescending()) {
            toggleSort();
        }
        if (!isSortedDescending()) {
            toggleSort();
        }
        if (!isSortedDescending()) {
            throw new RuntimeException("Unable to sort descending");
        }
    }

    public boolean isSorted() {
        return isSortedAscending() || isSortedDescending();
    }

    public boolean isSortedAscending() {
        return getElement().findElement(By.className("marker-sortable")).getAttribute("class").contains("triangle-top");
    }

    public boolean isSortedDescending() {
        return getElement().findElement(By.className("marker-sortable")).getAttribute("class").contains("triangle-bottom");
    }

}
