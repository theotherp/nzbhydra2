package org.nzbhydra.mapping.newznab.builder;


import org.junit.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.Assert.assertEquals;

public class RssItemBuilderTest {

    @Test
    public void testBuilder() {
        NewznabXmlItem item = RssItemBuilder.builder("title")
                .group("group")
                .poster("poster")
                .size(1000L)
                .category("category")
                .categoryNewznab("5000")
                .description("desc")
                .link("link")
                .hasNfo(true)
                .grabs(10).build();
        Map<String, String> attributes = item.getNewznabAttributes().stream().collect(Collectors.toMap(NewznabAttribute::getName, NewznabAttribute::getValue));
        assertEquals("group", attributes.get("group"));
        assertEquals("poster", attributes.get("poster"));
        assertEquals("5000", attributes.get("category"));
        assertEquals("1", attributes.get("nfo"));
        assertEquals(Long.valueOf(1000), item.getEnclosure().getLength());
        assertEquals("desc", item.getDescription());
        assertEquals("category", item.getCategory());
        assertEquals("link", item.getEnclosure().getUrl());


    }


}