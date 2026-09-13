package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequestFactory;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import java.lang.reflect.Field;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
class SearchWebTest {

    @Mock
    private Searcher searcher;
    @Mock
    private CategoryProvider categoryProvider;
    @Mock
    private SearchRequestFactory searchRequestFactory;
    @Mock
    private InternalSearchResultProcessor searchResultProcessor;
    @Mock
    private SimpMessageSendingOperations messagingTemplate;
    @Mock
    private CustomQueryAndTitleMappingHandler customQueryAndTitleMappingHandler;
    @Mock
    private DemoDataProvider demoDataProvider;

    @InjectMocks
    private SearchWeb testee = new SearchWeb();

    private final SearchResponse searchResponse = new SearchResponse();

    @BeforeEach
    void setUp() throws Exception {
        Category category = new Category("category");
        when(categoryProvider.getByInternalName(any())).thenReturn(category);
        SearchRequest searchRequest = new SearchRequest(SearchSource.INTERNAL, SearchType.SEARCH, 0, 100);
        searchRequest.setSearchRequestId(42L);
        when(searchRequestFactory.getSearchRequest(any(), any(), any(), anyLong(), any(), any())).thenReturn(searchRequest);
        when(searchRequestFactory.extendWithSavedIdentifiers(any())).thenAnswer((Answer<SearchRequest>) invocation -> invocation.getArgument(0));
        when(customQueryAndTitleMappingHandler.mapSearchRequest(any())).thenAnswer((Answer<SearchRequest>) invocation -> invocation.getArgument(0));
        when(searchResultProcessor.createSearchResponse(any())).thenReturn(searchResponse);
        when(searcher.search(any())).thenReturn(mock(org.nzbhydra.searching.SearchResult.class));
    }

    @Test
    void shouldReturnSearchResponseEvenWhenSearchStateWasEvicted() throws Exception {
        //Simulate the expiring map having evicted the state while the search was running
        when(searcher.search(any())).thenAnswer(invocation -> {
            searchStates().clear();
            return mock(org.nzbhydra.searching.SearchResult.class);
        });

        SearchResponse response = testee.search(new SearchRequestParameters(), null);

        assertThat(response).isEqualTo(searchResponse);
    }

    @Test
    void shouldReturnSearchResponseWhenSearchStateIsStillKnown() {
        SearchResponse response = testee.search(new SearchRequestParameters(), null);

        assertThat(response).isEqualTo(searchResponse);
        assertThat(searchStates().get(42L).isSearchFinished()).isTrue();
    }

    @SuppressWarnings("unchecked")
    private Map<Long, SearchState> searchStates() {
        try {
            Field field = SearchWeb.class.getDeclaredField("searchStates");
            field.setAccessible(true);
            return (Map<Long, SearchState>) field.get(testee);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}
