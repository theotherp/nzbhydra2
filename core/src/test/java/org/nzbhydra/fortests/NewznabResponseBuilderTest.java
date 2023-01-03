package org.nzbhydra.fortests;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;

import static org.assertj.core.api.Assertions.assertThat;

public class NewznabResponseBuilderTest {

    private NewznabResponseBuilder testee = new NewznabResponseBuilder();


    @Test
    void shouldBuild() {
        NewznabXmlRoot root = testee.getTestResult(1, 2, "itemTitle", null, null);
        assertThat(root.getRssChannel().getItems()).hasSize(2);
        assertThat(root.getRssChannel().getItems().get(0).getTitle()).isEqualTo("itemTitle1");

        root = testee.getTestResult(3, 3, "itemTitle", null, null);
        assertThat(root.getRssChannel().getItems()).hasSize(1);
        assertThat(root.getRssChannel().getItems().get(0).getTitle()).isEqualTo("itemTitle3");
    }

    @Test
    void shouldInsertOffsetAndTotal() {
        NewznabXmlRoot root = testee.getTestResult(1, 2, "itemTitle", null, null);
        assertThat(root.getRssChannel().getNewznabResponse().getOffset().intValue()).isEqualTo(0);
        assertThat(root.getRssChannel().getNewznabResponse().getTotal().intValue()).isEqualTo(2);

        root = testee.getTestResult(1, 2, "itemTitle", 2, 100);
        assertThat(root.getRssChannel().getNewznabResponse().getOffset().intValue()).isEqualTo(2);
        assertThat(root.getRssChannel().getNewznabResponse().getTotal().intValue()).isEqualTo(100);

    }

}
