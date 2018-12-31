package org.nzbhydra.config;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.indexer.IndexerCategoryConfig;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.MainCategory;
import org.nzbhydra.config.indexer.IndexerCategoryConfig.SubCategory;

import java.util.Arrays;

import static junit.framework.TestCase.assertEquals;

public class IndexerCategoryConfigTest {
    @InjectMocks
    private IndexerCategoryConfig testee = new IndexerCategoryConfig();

    @Test
    public void getNameFromId() throws Exception {
        testee.setCategories(Arrays.asList(new MainCategory(1000, "1000", Arrays.asList(new SubCategory(1010, "1010")))));
        assertEquals(testee.getNameFromId(1000), "1000");
        assertEquals(testee.getNameFromId(1010), "1000 1010");
        assertEquals(testee.getNameFromId(1234), "N/A");
    }


}