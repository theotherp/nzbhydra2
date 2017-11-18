package org.nzbhydra.tests.pageobjects;

import org.popper.fw.webdriver.elements.impl.DefaultCheckbox;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class CheckBox extends DefaultCheckbox implements ICheckBox {
    public CheckBox(WebElementReference reference) {
        super(reference);
    }


}
