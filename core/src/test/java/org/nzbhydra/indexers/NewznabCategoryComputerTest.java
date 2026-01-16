

package org.nzbhydra.indexers;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.util.Arrays;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.STRICT_STUBS)
class NewznabCategoryComputerTest {

    @Mock
    private CategoryProvider categoryProviderMock;

    Category animeCategory = new Category("anime");
    Category otherCategory = new Category("other");
    @Mock
    private ConfigProvider configProviderMock;

    @InjectMocks
    private NewznabCategoryComputer testee;


    @Test
    void shouldComputeCategory() {
        animeCategory.setSubtype(Category.Subtype.ANIME);
        when(categoryProviderMock.fromSubtype(Category.Subtype.ANIME)).thenReturn(Optional.of(animeCategory));
        when(categoryProviderMock.fromResultNewznabCategories(any())).thenReturn(otherCategory);
        IndexerConfig config = new IndexerConfig();
        config.setName("indexer");
        config.getCategoryMapping().setAnime(1010);
        SearchResultItem item = new SearchResultItem();

        //Found a specific mapping
        testee.computeCategory(item, Arrays.asList(1000, 1010), config);
        assertThat(item.getCategory()).isEqualTo(animeCategory);

        //Didn't find a specific mapping, use the general one from the categories
        testee.computeCategory(item, Arrays.asList(3030), config);
        assertThat(item.getCategory()).isEqualTo(otherCategory);
    }

}