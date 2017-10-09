package org.nzbhydra.tests.pageobjects;

import org.popper.fw.webdriver.elements.impl.DefaultLink;
import org.popper.fw.webdriver.elements.impl.WebElementReference;

public class Link extends DefaultLink implements ILink {

    public Link(WebElementReference reference) {
        super(reference);
    }
}
