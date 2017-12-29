/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.tests.pageobjects;

import org.nzbhydra.misc.Sleep;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.popper.fw.webdriver.elements.impl.AbstractWebElement;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

import java.util.List;

public class DropdownCheckboxButton extends AbstractWebElement implements IDropdownCheckboxButton {

    public DropdownCheckboxButton(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void selectAll() {
        setValueAll(true);
    }

    protected void setValueAll(boolean value) {
        List<WebElement> elements = getAllOptions();
        for (WebElement element : elements) {
            if (isElementSelected(element) ^ value) {
                element.click();
            }
        }
        ensureClosed();
    }

    private List<WebElement> getAllOptions() {
        return getWebelement().findElements(By.cssSelector("a"));
    }

    protected void ensureOpen() {
        if (!isOpen()) {
            getWebelement().findElement(By.tagName("button")).click();
        }
        Sleep.sleep(100);
    }

    private boolean isOpen() {
        return getWebelement().findElement(By.tagName("div")).getAttribute("class").contains("open");
    }

    protected void ensureClosed() {
        if (isOpen()) {
            getWebelement().findElement(By.tagName("button")).click();
        }
        Sleep.sleep(100);
    }

    @Override
    public void deselectAll() {
        setValueAll(false);
    }

    @Override
    public boolean isSelected(String caption) {
        ensureOpen();
        List<WebElement> elements = getAllOptions();
        for (WebElement element : elements) {
            if (element.getText().contains(caption)) {
                return isElementSelected(element);
            }
        }
        throw new RuntimeException("Unable to find option with caption " + caption);
    }

    @Override
    public void select(String caption) {
        ensureOpen();
        setValue(caption, true);
    }

    protected void setValue(String caption, boolean value) {
        List<WebElement> elements = getAllOptions();
        for (WebElement element : elements) {
            if (element.getText().contains(caption)) {
                if (isElementSelected(element) ^ value) {
                    element.click();
                }
            }
        }
        ensureClosed();
    }

    private boolean isElementSelected(WebElement element) {
        return element.findElement(By.tagName("span")).getAttribute("class").contains("glyphicon-ok");
    }

    @Override
    public void deselect(String caption) {
        ensureOpen();
        setValue(caption, false);

    }



}
