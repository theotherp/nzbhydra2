package org.nzbhydra.indexers;

import org.junit.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

public class NzbsOrgTest {

    @InjectMocks
    private NzbsOrg testee = new NzbsOrg();

    @Test
    public void shouldLimitQueryLengthWhenAddingForbiddenWords() throws Exception {
        testee.searchingConfig = new SearchingConfig();
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        request.getInternalData().setForbiddenWords(Arrays.asList("characters50sssssssssssssssssssssssssssssssssssss1", "characters50sssssssssssssssssssssssssssssssssssss2", "characters50sssssssssssssssssssssssssssssssssssss3", "characters50sssssssssssssssssssssssssssssssssssss4", "characters40ssssssssssssssssssssssssssss", "aaaaa", "bbbbb"));
        String query = testee.addForbiddenWords(request, "");
        assertThat(query.length()).isLessThan(255);
    }

    @Test
    public void shouldLimitQueryLengthWhenAddingRequiredWords() throws Exception {
        testee.searchingConfig = new SearchingConfig();
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        request.getInternalData().setRequiredWords(Arrays.asList("characters50sssssssssssssssssssssssssssssssssssss1", "characters50sssssssssssssssssssssssssssssssssssss2", "characters50sssssssssssssssssssssssssssssssssssss3", "characters50sssssssssssssssssssssssssssssssssssss4", "characters40ssssssssssssssssssssssssssss", "aaaaa", "bbbbb"));
        String query = testee.addRequiredWords(request, "");
        assertThat(query.length()).isLessThan(255);
    }
    
    @Test
    public void shouldTruncateLongQuery() {
        String longQuery = "";
        for (int i = 0; i < 56; i++) {
            longQuery += " " +"characters15sss"; 
        }assertThat(longQuery.length()).isGreaterThan(255);
        String query = testee.cleanupQuery(longQuery);
        assertThat(query.length()).isLessThan(255);
    }

}