package org.nzbhydra.fortests;

import org.junit.Test;
import org.nzbhydra.rssmapping.RssRoot;

import static org.junit.Assert.assertEquals;

public class NewznabResponseBuilderTest {

    private NewznabResponseBuilder testee = new NewznabResponseBuilder();


    @Test
    public void shouldBuild() {
        RssRoot root = testee.getTestResult(1, 2, "itemTitle", null, null);
        assertEquals(2, root.getRssChannel().getItems().size());
        assertEquals("itemTitle1", root.getRssChannel().getItems().get(0).getTitle());

        root = testee.getTestResult(3, 3, "itemTitle", null, null);
        assertEquals(1, root.getRssChannel().getItems().size());
        assertEquals("itemTitle3", root.getRssChannel().getItems().get(0).getTitle());
    }

    @Test
    public void shouldInsertOffsetAndTotal() {
        RssRoot root = testee.getTestResult(1, 2, "itemTitle", null, null);
        assertEquals(0, root.getRssChannel().getNewznabResponse().getOffset().intValue());
        assertEquals(2, root.getRssChannel().getNewznabResponse().getTotal().intValue());

        root = testee.getTestResult(1, 2, "itemTitle", 2, 100);
        assertEquals(2, root.getRssChannel().getNewznabResponse().getOffset().intValue());
        assertEquals(100, root.getRssChannel().getNewznabResponse().getTotal().intValue());

    }

}