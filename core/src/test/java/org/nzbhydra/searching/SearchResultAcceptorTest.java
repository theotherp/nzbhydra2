package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.Newznab;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
public class SearchResultAcceptorTest {

    @Mock
    private BaseConfig baseConfig;
    private SearchResultItem item;
    @Mock
    private SearchingConfig searchingConfig;
    @Mock
    private SearchRequest searchRequest;
    @Mock
    private IndexerConfig indexerConfig;
    @Mock
    private ConfigProvider configProvider;
    private InternalData internalData = new InternalData();
    private Category category = new Category();

    @InjectMocks
    private SearchResultAcceptor testee = new SearchResultAcceptor();

    @BeforeEach
    public void setUp() throws Exception {

        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        when(searchingConfig.isIgnorePassworded()).thenReturn(false);
        when(indexerConfig.getHost()).thenReturn("someHost");
        when(searchRequest.getInternalData()).thenReturn(internalData);
        when(searchRequest.getCategory()).thenReturn(category);
        item = new SearchResultItem();
        item.setCategory(category);
        when(searchRequest.meets(any())).thenCallRealMethod();
    }

    @Test
    void shouldCheckForRequiredWords() throws Exception {
        internalData.getRequiredWords().clear();
        internalData.getRequiredWords().add("abc.def");
        item.setTitle("abc.def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abc.DEF ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abc.dEF ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abcdef ghi");
        assertThat(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null)).isFalse();
        item.setTitle("abc def ghi");
        assertThat(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null)).isFalse();

        internalData.getRequiredWords().clear();
        internalData.getRequiredWords().add("abc");
        item.setTitle("abc def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abc.def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abcdef ghi");
        assertThat(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null)).isFalse();
        item.setTitle("def ghi");
        assertThat(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null)).isFalse();

        internalData.getRequiredWords().add("def");
        item.setTitle("abc def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abc de");
        assertThat(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null)).isFalse();

        internalData.getRequiredWords().add("def");
        item.setTitle("abc def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abc DEF ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
        item.setTitle("abc dEF ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item, null));
    }


    @Test
    void shouldCheckForForbiddenWords() throws Exception {
        internalData.getForbiddenWords().clear();
        internalData.getForbiddenWords().add("abc.def");
        item.setTitle("abc.def ghi");
        assertThat(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null)).isFalse();
        item.setTitle("abc.DEF ghi");
        assertThat(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null)).isFalse();
        item.setTitle("abc.dEF ghi");
        assertThat(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null)).isFalse();

        item.setTitle("abcdef ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null));
        item.setTitle("abc def ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null));


        internalData.getForbiddenWords().clear();
        internalData.getForbiddenWords().add("abc");
        item.setTitle("abc def ghi");
        assertThat(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null)).isFalse();
        item.setTitle("ABC def ghi");
        assertThat(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null)).isFalse();
        item.setTitle("aBC def ghi");
        assertThat(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null)).isFalse();
        item.setTitle("abcdef ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null));
        item.setTitle("def ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getForbiddenWords(), item, null));
    }

    @Test
    void shouldCheckForPassword() throws Exception {
        when(searchingConfig.isIgnorePassworded()).thenReturn(false);
        SearchResultItem item = new SearchResultItem();

        item.setPassworded(false);
        assertTrue(testee.checkForPassword(HashMultiset.create(), item));

        item.setPassworded(true);
        assertTrue(testee.checkForPassword(HashMultiset.create(), item));

        when(searchingConfig.isIgnorePassworded()).thenReturn(true);
        item.setPassworded(false);
        assertTrue(testee.checkForPassword(HashMultiset.create(), item));

        item.setPassworded(true);
        assertThat(testee.checkForPassword(HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldCheckForAge() {
        when(searchRequest.getMinage()).thenReturn(Optional.of(10));
        when(searchRequest.getMaxage()).thenReturn(Optional.of(100));
        SearchResultItem item = new SearchResultItem();

        item.setPubDate(Instant.now().minus(20, ChronoUnit.DAYS));
        assertTrue(testee.checkForAge(searchRequest, HashMultiset.create(), item));

        item.setPubDate(Instant.now().minus(5, ChronoUnit.DAYS));
        assertThat(testee.checkForAge(searchRequest, HashMultiset.create(), item)).isFalse();

        item.setPubDate(Instant.now().plus(105, ChronoUnit.DAYS));
        assertThat(testee.checkForAge(searchRequest, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldCheckForSize() {
        when(searchRequest.getMinsize()).thenReturn(Optional.of(10));
        when(searchRequest.getMaxsize()).thenReturn(Optional.of(100));
        SearchResultItem item = new SearchResultItem();
        item.setCategory(category);

        item.setSize(50 * 1024 * 1024L);
        assertTrue(testee.checkForSize(searchRequest, HashMultiset.create(), item));

        item.setSize(5 * 1024 * 1024L);
        assertThat(testee.checkForSize(searchRequest, HashMultiset.create(), item)).isFalse();

        item.setSize(105 * 1024 * 1024L);
        assertThat(testee.checkForSize(searchRequest, HashMultiset.create(), item)).isFalse();

        //Apply limits for API searches
        when(searchRequest.getMinsize()).thenReturn(Optional.empty());
        when(searchRequest.getMaxsize()).thenReturn(Optional.empty());

        category.setMaxSizePreset(1);
        category.setApplySizeLimitsToApi(true);
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertThat(testee.checkForSize(searchRequest, HashMultiset.create(), item)).isFalse();
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkForSize(searchRequest, HashMultiset.create(), item));

        category.setMinSizePreset(null);
        category.setMinSizePreset(200);
        category.setApplySizeLimitsToApi(true);
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertThat(testee.checkForSize(searchRequest, HashMultiset.create(), item)).isFalse();
        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkForSize(searchRequest, HashMultiset.create(), item));
    }

    @Test
    void shouldCheckForForbiddenPoster() {
        when(searchingConfig.getForbiddenPosters()).thenReturn(Arrays.asList("spammer"));

        item.setPoster("niceGuy");
        assertTrue(testee.checkForForbiddenPoster(HashMultiset.create(), item));

        item.setPoster(null);
        assertTrue(testee.checkForForbiddenPoster(HashMultiset.create(), item));

        item.setPoster("spammer");
        assertThat(testee.checkForForbiddenPoster(HashMultiset.create(), item)).isFalse();

        when(searchingConfig.getForbiddenPosters()).thenReturn(Arrays.asList());
        assertTrue(testee.checkForForbiddenPoster(HashMultiset.create(), item));
    }

    @Test
    void shouldCheckForForbiddenGroup() {
        when(searchingConfig.getForbiddenGroups()).thenReturn(Arrays.asList("spammergroup"));

        item.setGroup("niceGroup");
        assertTrue(testee.checkForForbiddenGroup(HashMultiset.create(), item));

        item.setGroup(null);
        assertTrue(testee.checkForForbiddenGroup(HashMultiset.create(), item));

        item.setGroup("spammergroup");
        assertThat(testee.checkForForbiddenGroup(HashMultiset.create(), item)).isFalse();

        when(searchingConfig.getForbiddenGroups()).thenReturn(Collections.emptyList());
        assertTrue(testee.checkForForbiddenGroup(HashMultiset.create(), item));
    }

    @Test
    void shouldCheckForForbiddenCategory() {
        category.setIgnoreResultsFrom(SearchSourceRestriction.BOTH);

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertThat(testee.checkForCategoryShouldBeIgnored(searchRequest, HashMultiset.create(), item)).isFalse();
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertThat(testee.checkForCategoryShouldBeIgnored(searchRequest, HashMultiset.create(), item)).isFalse();

        category.setIgnoreResultsFrom(SearchSourceRestriction.API);

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkForCategoryShouldBeIgnored(searchRequest, HashMultiset.create(), item));
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertThat(testee.checkForCategoryShouldBeIgnored(searchRequest, HashMultiset.create(), item)).isFalse();

        category.setIgnoreResultsFrom(SearchSourceRestriction.INTERNAL);

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertThat(testee.checkForCategoryShouldBeIgnored(searchRequest, HashMultiset.create(), item)).isFalse();
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkForCategoryShouldBeIgnored(searchRequest, HashMultiset.create(), item));
    }

    @Test
    void shouldCheckForCategoryDisabledForIndexer() {
        Indexer indexer = new Newznab();
        indexer.initialize(indexerConfig, new IndexerEntity());
        item.setIndexer(indexer);

        //All categories enabled
        when(indexerConfig.getEnabledCategories()).thenReturn(Collections.emptyList());
        assertTrue(testee.checkForCategoryDisabledForIndexer(searchRequest, HashMultiset.create(), item));

        //Used category enabled
        when(indexerConfig.getEnabledCategories()).thenReturn(Arrays.asList(category.getName()));
        assertTrue(testee.checkForCategoryDisabledForIndexer(searchRequest, HashMultiset.create(), item));

        //Only other category enabled
        when(indexerConfig.getEnabledCategories()).thenReturn(Arrays.asList("Other"));
        assertThat(testee.checkForCategoryDisabledForIndexer(searchRequest, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldCheckRegexes() {
        item.setTitle("aabccd");
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "", ""));
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "a+b", ""));
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "", ""));
        assertThat(testee.checkRegexes(item, HashMultiset.create(), "a+b", "c+d")).isFalse();
        assertThat(testee.checkRegexes(item, HashMultiset.create(), "", "c+d")).isFalse();

        item.setTitle("My.favorite.Show.s01e03.720p.HDTV.mkv");
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "720p.HDTV", ""));
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "", "SDTV"));
        assertThat(testee.checkRegexes(item, HashMultiset.create(), "", "720p.HDTV")).isFalse();
        assertThat(testee.checkRegexes(item, HashMultiset.create(), "Show", "720p.HDTV")).isFalse();

        item.setTitle("My.favorite.camera.Show.s01e03.720p.HDTV.mkv");
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "", "\\.(SDTV|CAM)\\."));
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "(720p|1080p).*.mkv$", ""));
        item.setTitle("My.favorite.camera.Show.s01e03.720p.HDTV.avi");
        assertThat(testee.checkRegexes(item, HashMultiset.create(), "(720p|1080p).*.mkv$", "")).isFalse();
        item.setTitle("My.movie.about.mkv.avi");
        assertThat(testee.checkRegexes(item, HashMultiset.create(), "\\.mkv$", "")).isFalse();


    }

    @Test
    void shouldAcceptWhenNoWhitelistConfigured() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Collections.emptyList());
        item.setTitle("Some result");

        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));
    }

    @Test
    void shouldRejectItemWithNoAttributesWhenWhitelistConfigured() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        item.setTitle("Some result");
        // item has no attributes set (empty map by default)

        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldAcceptItemMatchingSingleWhitelistEntry() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        item.setTitle("Some result");
        item.getAttributes().put("subs", "English");

        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));
    }

    @Test
    void shouldAcceptItemMatchingWhitelistEntryCaseInsensitive() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=english"));
        item.setTitle("Some result");
        item.getAttributes().put("SUBS", "ENGLISH");

        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));
    }

    @Test
    void shouldRejectItemNotMatchingWhitelistEntry() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        item.setTitle("Some result");
        item.getAttributes().put("subs", "French");

        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldAcceptItemMatchingAnyWhitelistEntryOrLogic() {
        // OR logic: accept if subs=English OR subs=French
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English", "subs=French"));
        item.setTitle("Some result");

        // English matches first entry
        item.getAttributes().put("subs", "English");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));

        // French matches second entry
        item.getAttributes().clear();
        item.getAttributes().put("subs", "French");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));

        // German doesn't match any
        item.getAttributes().clear();
        item.getAttributes().put("subs", "German");
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldRequireAllValuesForCommaSeparatedAndLogic() {
        // AND logic for comma-separated: subs=English,French requires BOTH to be in the value
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English,French"));
        item.setTitle("Some result");

        // Value contains both English and French
        item.getAttributes().put("subs", "English French German");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));

        // Value contains only English
        item.getAttributes().clear();
        item.getAttributes().put("subs", "English");
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();

        // Value contains only French
        item.getAttributes().clear();
        item.getAttributes().put("subs", "French");
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldCombineOrAndAndLogicCorrectly() {
        // Two entries: "subs=English,French" (requires both) OR "subs=Japanese"
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English,French", "subs=Japanese"));
        item.setTitle("Some result");

        // Match first entry (both English and French)
        item.getAttributes().put("subs", "English French");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));

        // Match second entry (Japanese)
        item.getAttributes().clear();
        item.getAttributes().put("subs", "Japanese");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));

        // Only English doesn't match either entry
        item.getAttributes().clear();
        item.getAttributes().put("subs", "English");
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldRejectItemWithWrongAttribute() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        item.setTitle("Some result");
        // Item has a different attribute, not 'subs'
        item.getAttributes().put("language", "English");

        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldApplyWhitelistOnlyToConfiguredCategories() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        when(indexerConfig.getAttributeWhitelistCategories()).thenReturn(Arrays.asList("Movies"));
        item.setTitle("Some result");

        // Item in Movies category without matching attributes - should be rejected
        Category moviesCategory = new Category();
        moviesCategory.setName("Movies");
        item.setCategory(moviesCategory);
        item.getAttributes().put("subs", "French");
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();

        // Item in Movies category with matching attributes - should be accepted
        item.getAttributes().clear();
        item.getAttributes().put("subs", "English");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));

        // Item in TV category without matching attributes - should be accepted (category not in whitelist categories)
        Category tvCategory = new Category();
        tvCategory.setName("TV");
        item.setCategory(tvCategory);
        item.getAttributes().clear();
        item.getAttributes().put("subs", "French");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));
    }

    @Test
    void shouldApplyWhitelistToAllCategoriesWhenNoCategoriesConfigured() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        when(indexerConfig.getAttributeWhitelistCategories()).thenReturn(Collections.emptyList());
        item.setTitle("Some result");

        // Item in any category without matching attributes - should be rejected
        Category moviesCategory = new Category();
        moviesCategory.setName("Movies");
        item.setCategory(moviesCategory);
        item.getAttributes().put("subs", "French");
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();

        // Item with matching attributes - should be accepted
        item.getAttributes().clear();
        item.getAttributes().put("subs", "English");
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));
    }

    @Test
    void shouldAcceptItemWithNullCategoryWhenCategoriesConfigured() {
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        when(indexerConfig.getAttributeWhitelistCategories()).thenReturn(Arrays.asList("Movies"));
        item.setTitle("Some result");
        item.setCategory(null);
        item.getAttributes().put("subs", "French");

        // Item with null category should be accepted (skip filtering) when categories are configured
        assertTrue(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item));
    }

    @Test
    void shouldAcceptItemWithMultiValueAttributeSeparatedByDash() {
        // Real-world example: subs attribute with multiple languages separated by " - "
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English"));
        item.setTitle("Some result");
        item.getAttributes().put("subs", "English - Chinese - Czech - Danish - Dutch - Finnish - French - German - Hungarian - Italian - Norwegian - Polish - Portuguese - Romanian - Spanish - Swedish");

        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isTrue();

        // Should also work for a value in the middle
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=German"));
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isTrue();

        // Should reject when the required value is not in the list
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=Japanese"));
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();
    }

    @Test
    void shouldRequireAllValuesForAndLogicWithDashSeparatedAttribute() {
        // AND logic (comma-separated whitelist) with dash-separated attribute value
        item.setTitle("Some result");
        item.getAttributes().put("subs", "English - Chinese - French - German");

        // Requires both English AND French - should match
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English,French"));
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isTrue();

        // Requires both English AND Japanese - should reject (Japanese not in value)
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English,Japanese"));
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isFalse();

        // Requires English, French AND German - should match (all present)
        when(indexerConfig.getAttributeWhitelist()).thenReturn(Arrays.asList("subs=English,French,German"));
        assertThat(testee.checkAttributeWhitelist(indexerConfig, HashMultiset.create(), item)).isTrue();
    }


}
