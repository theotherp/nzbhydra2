package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.SubCategory;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

public class IndexerCategoryConfigTest {
    @InjectMocks
    private IndexerCategoryConfig testee = new IndexerCategoryConfig();

    @Test
    void getNameFromId() throws Exception {
        testee.setCategories(Arrays.asList(new MainCategory(1000, "1000", Arrays.asList(new SubCategory(1010, "1010")))));
        assertThat("1000").isEqualTo(testee.getNameFromId(1000));
        assertThat("1000 1010").isEqualTo(testee.getNameFromId(1010));
        assertThat("N/A").isEqualTo(testee.getNameFromId(1234));
    }


}
