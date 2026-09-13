

package org.nzbhydra.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategories;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlSearch;

import java.util.Arrays;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class CapsGeneratorTest {

    @Mock
    private ConfigProvider configProviderMock;

    @InjectMocks
    private CapsGenerator testee = new CapsGenerator();

    private BaseConfig baseConfig;

    @BeforeEach
    public void setUp() {

        BaseConfig baseConfig = new BaseConfig();

        CategoriesConfig categoriesConfig = new CategoriesConfig();
        baseConfig.setCategoriesConfig(categoriesConfig);

        Category misc = new Category("Misc");
        misc.getNewznabCategories().add(Arrays.asList(1000));
        categoriesConfig.getCategories().add(misc);

        Category movies = new Category("Movies");
        movies.getNewznabCategories().add(Arrays.asList(2000));
        categoriesConfig.getCategories().add(movies);

        Category moviesHd = new Category("Movies HD");
        moviesHd.getNewznabCategories().add(Arrays.asList(2040));
        moviesHd.getNewznabCategories().add(Arrays.asList(2050));
        moviesHd.getNewznabCategories().add(Arrays.asList(10100));
        categoriesConfig.getCategories().add(moviesHd);

        Category musc = new Category("Musc");
        musc.getNewznabCategories().add(Arrays.asList(7050));
        categoriesConfig.getCategories().add(musc);

        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        this.baseConfig = baseConfig;
    }

    @Test
    void shouldGenerateCategoriesFromConfig() throws Exception {
        CapsXmlCategories xmlCategories = testee.getCapsXmlCategories();

        assertThat(xmlCategories.getCategories().size()).isEqualTo(3);
        assertThat(xmlCategories.getCategories().get(0).getName()).isEqualTo("Misc");

        assertThat(xmlCategories.getCategories().get(1).getName()).isEqualTo("Movies");
        assertThat(xmlCategories.getCategories().get(1).getSubCategories().size()).isEqualTo(1);
        assertThat(xmlCategories.getCategories().get(1).getSubCategories().get(0).getName()).isEqualTo("Movies HD");

        assertThat(xmlCategories.getCategories().get(2).getName()).isEqualTo("Musc");
    }

    @Test
    void shouldAdvertiseBookSearchWhenQueriesAreGeneratedForApiSearches() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.BOTH);

        CapsXmlSearch bookSearch = getBookSearch();

        assertThat(bookSearch.getAvailable()).isEqualTo("yes");
        assertThat(bookSearch.getSupportedParams()).contains("author", "title");
    }

    @Test
    void shouldNotAdvertiseBookSearchWhenQueriesAreOnlyGeneratedInternallyAndNoIndexerSupportsBooks() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.INTERNAL);
        baseConfig.getIndexers().add(indexer(IndexerConfig.State.ENABLED, ActionAttribute.SEARCH, ActionAttribute.TVSEARCH));

        CapsXmlSearch bookSearch = getBookSearch();

        assertThat(bookSearch.getAvailable()).isEqualTo("no");
        assertThat(bookSearch.getSupportedParams()).isEmpty();
    }

    @Test
    void shouldAdvertiseBookSearchWhenAnEnabledIndexerSupportsBooks() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.INTERNAL);
        baseConfig.getIndexers().add(indexer(IndexerConfig.State.ENABLED, ActionAttribute.BOOK));

        CapsXmlSearch bookSearch = getBookSearch();

        assertThat(bookSearch.getAvailable()).isEqualTo("yes");
    }

    @Test
    void shouldNotAdvertiseBookSearchWhenTheOnlyBookIndexerIsDisabledByTheUser() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.INTERNAL);
        baseConfig.getIndexers().add(indexer(IndexerConfig.State.DISABLED_USER, ActionAttribute.BOOK));

        CapsXmlSearch bookSearch = getBookSearch();

        assertThat(bookSearch.getAvailable()).isEqualTo("no");
    }

    @Test
    void shouldAdvertiseBookSearchWhenQueriesAreGeneratedForAllButRssSearches() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.ALL_BUT_RSS);

        assertThat(getBookSearch().getAvailable()).isEqualTo("yes");
    }

    @Test
    void shouldNotAdvertiseBookSearchWhenQueriesAreOnlyGeneratedForRssSearches() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.ONLY_RSS);

        assertThat(getBookSearch().getAvailable()).isEqualTo("no");
    }

    @Test
    void shouldNotAdvertiseBookSearchWhenTheOnlyBookIndexerIsNotEnabledForApiSearches() {
        baseConfig.getSearching().setGenerateQueries(SearchSourceRestriction.INTERNAL);
        IndexerConfig indexerConfig = indexer(IndexerConfig.State.ENABLED, ActionAttribute.BOOK);
        indexerConfig.setEnabledForSearchSource(SearchSourceRestriction.INTERNAL);
        baseConfig.getIndexers().add(indexerConfig);

        assertThat(getBookSearch().getAvailable()).isEqualTo("no");
    }

    private CapsXmlSearch getBookSearch() {
        CapsXmlRoot capsRoot = (CapsXmlRoot) testee.getCaps(OutputType.XML, NewznabResponse.SearchType.NEWZNAB).getBody();
        return capsRoot.getSearching().getBookSearch();
    }

    private IndexerConfig indexer(IndexerConfig.State state, ActionAttribute... supportedSearchTypes) {
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName("indexer");
        indexerConfig.setState(state);
        indexerConfig.setSupportedSearchTypes(Arrays.asList(supportedSearchTypes));
        return indexerConfig;
    }

}