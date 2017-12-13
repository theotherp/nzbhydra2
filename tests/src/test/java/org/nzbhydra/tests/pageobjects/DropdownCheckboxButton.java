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
        List<WebElement> elements = getWebelement().findElements(By.className("option"));
        for (WebElement element : elements) {
            if (element.findElement(By.tagName("span")).getAttribute("class").contains("glyphicon-ok") ^ value) {
                element.click();
            }
        }
    }

    protected void ensureOpen() {
        if (!getWebelement().getAttribute("class").contains("open")) {
            getWebelement().click();
        }
        Sleep.sleep(100);
    }

    protected void ensureClosed() {
        if (getWebelement().getAttribute("class").contains("open")) {
            getWebelement().click();
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
        List<WebElement> elements = getWebelement().findElements(By.className("option"));
        for (WebElement element : elements) {
            if (element.getText().contains(caption)) {
                return element.findElement(By.tagName("span")).getAttribute("class").contains("glyphicon-ok");
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
        List<WebElement> elements = getWebelement().findElements(By.className("option"));
        for (WebElement element : elements) {
            if (element.getText().contains(caption)) {
                if (element.findElement(By.tagName("span")).getAttribute("class").contains("glyphicon-ok") ^ value) {
                    element.click();
                }
            }
        }
    }

    @Override
    public void deselect(String caption) {
        ensureOpen();
        setValue(caption, false);
    }



}
