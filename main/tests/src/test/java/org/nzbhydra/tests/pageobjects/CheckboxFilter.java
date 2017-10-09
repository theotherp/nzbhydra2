package org.nzbhydra.tests.pageobjects;

import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

import java.util.List;
import java.util.stream.Collectors;

public class CheckboxFilter extends AbstractWebElement implements ICheckboxFilter {

    public CheckboxFilter(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void filterBy(List<String> values) {
        if (!getWebelement().findElement(By.className("checkbox-filter-button-apply")).isDisplayed()) {
            getWebelement().findElement(By.className("toggle-column-filter")).click();
        }
        List<WebElement> elements = getWebelement().findElements(By.className("checkbox-filter-option"));
        for (WebElement element : elements) {
            String label = element.getAttribute("data-label");
            boolean wantedButNotSelected = values.contains(label) && !element.isSelected();
            boolean notWantedButSelected = !values.contains(label) && element.isSelected();
            if (wantedButNotSelected || notWantedButSelected) {
                element.click();
            }
        }

        getWebelement().findElement(By.className("checkbox-filter-button-apply")).click();
    }

    @Override
    public void selectAll() {
        filterBy(getWebelement().findElements(By.className("checkbox-filter-option")).stream().map(x -> x.getAttribute("data-label")).collect(Collectors.toList()));
    }

    @Override
    public void invertSelection() {
        getWebelement().findElement(By.className("checkbox-filter-button-invert")).click();
    }
}
