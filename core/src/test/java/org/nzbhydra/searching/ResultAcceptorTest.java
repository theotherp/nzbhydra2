package org.nzbhydra.searching;

import com.google.common.collect.HashMultiset;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.searching.searchrequests.InternalData;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Collections;
import java.util.Optional;

import static junit.framework.TestCase.assertFalse;
import static junit.framework.TestCase.assertTrue;
import static org.mockito.Mockito.when;

public class ResultAcceptorTest {

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
    private ResultAcceptor testee = new ResultAcceptor();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        when(baseConfig.getSearching()).thenReturn(searchingConfig);
        when(searchingConfig.isIgnorePassworded()).thenReturn(false);
        when(indexerConfig.getHost()).thenReturn("someHost");
        when(searchRequest.getInternalData()).thenReturn(internalData);
        when(searchRequest.getCategory()).thenReturn(category);
        item = new SearchResultItem();
        item.setCategory(category);
    }

    @Test
    public void shouldCallSubroutines() {

    }

    @Test
    public void shouldCheckForRequiredWords() throws Exception {
        internalData.getRequiredWords().clear();
        internalData.getRequiredWords().add("abc.def");
        item.setTitle("abc.def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));
        item.setTitle("abcdef ghi");
        assertFalse(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));
        item.setTitle("abc def ghi");
        assertFalse(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));


        internalData.getRequiredWords().clear();
        internalData.getRequiredWords().add("abc");
        item.setTitle("abc def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));
        item.setTitle("abc.def ghi");
        assertTrue(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));
        item.setTitle("abcdef ghi");
        assertFalse(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));
        item.setTitle("def ghi");
        assertFalse(testee.checkRequiredWords(HashMultiset.create(), internalData.getRequiredWords(), item));
    }


    @Test
    public void shouldCheckForForbiddenWords() throws Exception {
        internalData.getExcludedWords().clear();
        internalData.getExcludedWords().add("abc.def");
        item.setTitle("abc.def ghi");
        assertFalse(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getExcludedWords(), item));
        item.setTitle("abcdef ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getExcludedWords(), item));
        item.setTitle("abc def ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getExcludedWords(), item));


        internalData.getExcludedWords().clear();
        internalData.getExcludedWords().add("abc");
        item.setTitle("abc def ghi");
        assertFalse(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getExcludedWords(), item));
        item.setTitle("abcdef ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getExcludedWords(), item));
        item.setTitle("def ghi");
        assertTrue(testee.checkForForbiddenWords(indexerConfig, HashMultiset.create(), internalData.getExcludedWords(), item));
    }

    @Test
    public void shouldCheckForPassword() throws Exception {
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
        assertFalse(testee.checkForPassword(HashMultiset.create(), item));
    }

    @Test
    public void shouldCheckForAge() {
        when(searchRequest.getMinage()).thenReturn(Optional.of(10));
        when(searchRequest.getMaxage()).thenReturn(Optional.of(100));
        SearchResultItem item = new SearchResultItem();

        item.setPubDate(Instant.now().minus(20, ChronoUnit.DAYS));
        assertTrue(testee.checkForAge(searchRequest, HashMultiset.create(), item));

        item.setPubDate(Instant.now().minus(5, ChronoUnit.DAYS));
        assertFalse(testee.checkForAge(searchRequest, HashMultiset.create(), item));

        item.setPubDate(Instant.now().plus(105, ChronoUnit.DAYS));
        assertFalse(testee.checkForAge(searchRequest, HashMultiset.create(), item));
    }

    @Test
    public void shouldCheckForSize() {
        when(searchRequest.getMinsize()).thenReturn(Optional.of(10));
        when(searchRequest.getMaxsize()).thenReturn(Optional.of(100));
        SearchResultItem item = new SearchResultItem();

        item.setSize(50 * 1024 * 1024L);
        assertTrue(testee.checkForSize(searchRequest, HashMultiset.create(), item));

        item.setSize(5 * 1024 * 1024L);
        assertFalse(testee.checkForSize(searchRequest, HashMultiset.create(), item));

        item.setSize(105 * 1024 * 1024L);
        assertFalse(testee.checkForSize(searchRequest, HashMultiset.create(), item));
    }

    @Test
    public void shouldCheckForForbiddenPoster() {
        when(searchingConfig.getForbiddenPosters()).thenReturn(Arrays.asList("spammer"));

        item.setPoster("niceGuy");
        assertTrue(testee.checkForForbiddenPoster(HashMultiset.create(), item));

        item.setPoster(null);
        assertTrue(testee.checkForForbiddenPoster(HashMultiset.create(), item));

        item.setPoster("spammer");
        assertFalse(testee.checkForForbiddenPoster(HashMultiset.create(), item));

        when(searchingConfig.getForbiddenPosters()).thenReturn(Arrays.asList());
        assertTrue(testee.checkForForbiddenPoster(HashMultiset.create(), item));
    }

    @Test
    public void shouldCheckForForbiddenGroup() {
        when(searchingConfig.getForbiddenGroups()).thenReturn(Arrays.asList("spammergroup"));

        item.setGroup("niceGroup");
        assertTrue(testee.checkForForbiddenGroup(HashMultiset.create(), item));

        item.setGroup(null);
        assertTrue(testee.checkForForbiddenGroup(HashMultiset.create(), item));

        item.setGroup("spammergroup");
        assertFalse(testee.checkForForbiddenGroup(HashMultiset.create(), item));

        when(searchingConfig.getForbiddenGroups()).thenReturn(Collections.emptyList());
        assertTrue(testee.checkForForbiddenGroup(HashMultiset.create(), item));
    }

    @Test
    public void shouldCheckForForbiddenCategory() {
        category.setIgnoreResultsFrom(SearchSourceRestriction.BOTH);

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertFalse(testee.checkForCategory(searchRequest, HashMultiset.create(), item));
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertFalse(testee.checkForCategory(searchRequest, HashMultiset.create(), item));

        category.setIgnoreResultsFrom(SearchSourceRestriction.API);

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertTrue(testee.checkForCategory(searchRequest, HashMultiset.create(), item));
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertFalse(testee.checkForCategory(searchRequest, HashMultiset.create(), item));

        category.setIgnoreResultsFrom(SearchSourceRestriction.INTERNAL);

        when(searchRequest.getSource()).thenReturn(SearchSource.INTERNAL);
        assertFalse(testee.checkForCategory(searchRequest, HashMultiset.create(), item));
        when(searchRequest.getSource()).thenReturn(SearchSource.API);
        assertTrue(testee.checkForCategory(searchRequest, HashMultiset.create(), item));
    }

    @Test
    public void shouldCheckRegexes() {
        item.setTitle("aabccd");
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "", ""));
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "a+b", ""));
        assertTrue(testee.checkRegexes(item, HashMultiset.create(), "", ""));
        assertFalse(testee.checkRegexes(item, HashMultiset.create(), "a+b", "c+d"));
        assertFalse(testee.checkRegexes(item, HashMultiset.create(), "", "c+d"));
    }


}