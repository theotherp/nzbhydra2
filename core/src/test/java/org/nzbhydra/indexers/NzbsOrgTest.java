package org.nzbhydra.indexers;

import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchingConfig;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

public class NzbsOrgTest {
    @Mock
    private ConfigProvider configProviderMock;

    @InjectMocks
    private NzbsOrg testee = new NzbsOrg();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.setSearching(new SearchingConfig());
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    public void shouldLimitQueryLengthWhenAddingForbiddenWords() throws Exception {
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        request.getInternalData().setForbiddenWords(Arrays.asList("characters50sssssssssssssssssssssssssssssssssssss1", "characters50sssssssssssssssssssssssssssssssssssss2", "characters50sssssssssssssssssssssssssssssssssssss3", "characters50sssssssssssssssssssssssssssssssssssss4", "characters40ssssssssssssssssssssssssssss", "aaaaa", "bbbbb"));
        String query = testee.addForbiddenWords(request, "");
        assertThat(query.length()).isLessThan(255);
    }

    @Test
    public void shouldLimitQueryLengthWhenAddingRequiredWords() throws Exception {
        SearchRequest request = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        request.getInternalData().setRequiredWords(Arrays.asList("characters50sssssssssssssssssssssssssssssssssssss1", "characters50sssssssssssssssssssssssssssssssssssss2", "characters50sssssssssssssssssssssssssssssssssssss3", "characters50sssssssssssssssssssssssssssssssssssss4", "characters40ssssssssssssssssssssssssssss", "aaaaa", "bbbbb"));
        String query = testee.addRequiredWords(request, "");
        assertThat(query.length()).isLessThan(255);
    }
    
    @Test
    public void shouldTruncateLongQuery() {
        StringBuilder longQuery = new StringBuilder();
        for (int i = 0; i < 56; i++) {
            longQuery.append(" " + "characters15sss");
        }assertThat(longQuery.length()).isGreaterThan(255);
        String query = testee.cleanupQuery(longQuery.toString());
        assertThat(query.length()).isLessThan(255);
    }

}