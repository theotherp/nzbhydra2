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
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class IndexerSelectionButton extends SelectionButton implements IIndexerSelectionButton {

    public IndexerSelectionButton(WebElementReference reference) {
        super(reference);
    }


    @Override
    public void reset() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        Sleep.sleep(100);
        getWebelement().findElement(By.className("selection-button-reset-selection")).click();
    }

    @Override
    public void selectAllUsenet() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        Sleep.sleep(100);
        getWebelement().findElement(By.className("selection-button-select-usenet")).click();
    }

    @Override
    public void selectAllTorrent() {
        getWebelement().findElement(By.className("selection-button-toggle-dropdown")).click();
        Sleep.sleep(100);
        getWebelement().findElement(By.className("selection-button-select-torrent")).click();
    }
}
