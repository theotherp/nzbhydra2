package org.nzbhydra.mapping.newznab.builder;


import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

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
        assertThat(attributes.get("group")).isEqualTo("group");
        assertThat(attributes.get("poster")).isEqualTo("poster");
        assertThat(attributes.get("category")).isEqualTo("5000");
        assertThat(attributes.get("nfo")).isEqualTo("1");
        assertThat(item.getEnclosure().getLength()).isEqualTo(Long.valueOf(1000));
        assertThat(item.getDescription()).isEqualTo("desc");
        assertThat(item.getCategory()).isEqualTo("category");
        assertThat(item.getEnclosure().getUrl()).isEqualTo("link");


    }


}
