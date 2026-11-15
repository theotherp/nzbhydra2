package org.nzbhydra.indexers.torbox;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.IndexerWebAccess;
import org.nzbhydra.indexers.QueryGenerator;
import org.nzbhydra.indexers.SearchRequestIdConverter;
import org.nzbhydra.indexers.exceptions.IndexerAccessException;
import org.nzbhydra.indexers.torbox.mapping.TorboxSearchResponse;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class TorboxTest {

    private static final int INSTANCES = 10;

    private final TorboxSearchExecutor searchExecutor = new TorboxSearchExecutor();

    @Mock
    private QueryGenerator queryGeneratorMock;
    @Mock
    private SearchRequestIdConverter searchRequestIdConverterMock;
    @Mock
    private IndexerWebAccess indexerWebAccessMock;

    @AfterEach
    public void tearDown() {
        searchExecutor.shutdown();
    }

    @Test
    public void shouldNotAccumulateSearchThreadsWhenInstancesAreReplaced() throws Exception {
        when(queryGeneratorMock.generateQueryIfApplicable(any(), any(), any())).thenReturn("query");
        when(indexerWebAccessMock.get(any(), any(), eq(TorboxSearchResponse.class))).thenThrow(new IndexerAccessException("mocked"));
        long threadsBefore = countSearchThreads();

        for (int i = 0; i < INSTANCES; i++) {
            // Like SearchModuleProvider.loadIndexers on every config save: a new instance replaces the old one
            Torbox torbox = createTorbox();
            assertThatThrownBy(() -> torbox.buildSearchUrlAndCall(mock(SearchRequest.class), 0, 100))
                .isInstanceOf(IndexerAccessException.class);
        }

        // A search runs two calls in parallel. Allow some slack for a thread that is still finishing when the next
        // search starts, but nowhere near two threads per discarded instance.
        assertThat(countSearchThreads() - threadsBefore).isLessThanOrEqualTo(4);
    }

    private Torbox createTorbox() {
        Torbox torbox = new Torbox(queryGeneratorMock, searchExecutor);
        ReflectionTestUtils.setField(torbox, "searchRequestIdConverter", searchRequestIdConverterMock);
        ReflectionTestUtils.setField(torbox, "indexerWebAccess", indexerWebAccessMock);
        IndexerConfig config = new IndexerConfig();
        config.setName("torbox");
        ReflectionTestUtils.setField(torbox, "config", config);
        return torbox;
    }

    private static long countSearchThreads() {
        return Thread.getAllStackTraces().keySet().stream()
            .filter(Thread::isAlive)
            .filter(thread -> thread.getName().startsWith(TorboxSearchExecutor.THREAD_NAME_PREFIX))
            .count();
    }
}
