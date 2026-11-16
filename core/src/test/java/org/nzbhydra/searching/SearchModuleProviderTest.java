package org.nzbhydra.searching;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessEntityShort;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerHandlingStrategy;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.status.IndexerLimit;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SearchModuleProviderTest {

    private static final int INDEXER_COUNT = 5;

    @Mock
    private IndexerRepository indexerRepository;
    @Mock
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Mock
    private IndexerLimitRepository indexerStatusRepository;
    @Mock
    private IndexerInstantiator indexerInstantiator;
    @Mock
    private IndexerHandlingStrategy<Indexer<?>> indexerHandlingStrategy;

    @InjectMocks
    private SearchModuleProvider testee;

    private List<IndexerConfig> indexerConfigs;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(testee, "indexerHandlingStrategies", List.of(indexerHandlingStrategy));
        when(indexerHandlingStrategy.handlesIndexerConfig(any())).thenReturn(true);
        when(indexerHandlingStrategy.getName()).thenReturn("NEWZNAB");
        when(indexerInstantiator.instantiateIndexer(anyString())).thenAnswer(invocation -> {
            Indexer indexer = mock(Indexer.class);
            AtomicReference<IndexerConfig> config = new AtomicReference<>();
            doAnswer(x -> {
                config.set(x.getArgument(0));
                return null;
            }).when(indexer).initialize(any(), any());
            when(indexer.getConfig()).thenAnswer(x -> config.get());
            return indexer;
        });
        when(indexerRepository.findByName(anyString())).thenAnswer(invocation -> {
            //Simulate the database call that sits between two indexers being added
            Thread.sleep(2);
            IndexerEntity entity = new IndexerEntity();
            entity.setName(invocation.getArgument(0));
            return entity;
        });
        when(indexerStatusRepository.findByIndexer(any())).thenAnswer(invocation -> new IndexerLimit(invocation.getArgument(0)));

        indexerConfigs = IntStream.range(0, INDEXER_COUNT).mapToObj(i -> {
            IndexerConfig config = new IndexerConfig();
            config.setName("indexer" + i);
            config.setState(i == 0 ? IndexerConfig.State.DISABLED_USER : IndexerConfig.State.ENABLED);
            return config;
        }).collect(Collectors.toList());
    }

    @Test
    void shouldProvideLoadedIndexers() {
        testee.loadIndexers(indexerConfigs);

        assertThat(testee.getIndexers()).hasSize(INDEXER_COUNT);
        assertThat(testee.getEnabledIndexers()).hasSize(INDEXER_COUNT - 1);
        assertThat(testee.getIndexerByName("indexer3").getConfig().getName()).isEqualTo("indexer3");
        assertThatThrownBy(() -> testee.getIndexerByName("unknown")).isInstanceOf(RuntimeException.class);
    }

    @Test
    void shouldReturnDefensiveCopyOfIndexers() {
        testee.loadIndexers(indexerConfigs);

        List<Indexer<?>> indexers = testee.getIndexers();
        indexers.clear();

        assertThat(testee.getIndexers()).hasSize(INDEXER_COUNT);
    }

    @Test
    void shouldNeverSeeEmptyOrPartialIndexerListWhileReloading() throws Exception {
        testee.loadIndexers(indexerConfigs);

        AtomicBoolean loading = new AtomicBoolean(true);
        AtomicInteger reads = new AtomicInteger();
        CountDownLatch firstReadDone = new CountDownLatch(1);
        List<Integer> unexpectedSizes = new ArrayList<>();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<?> reader = executor.submit(() -> {
                while (loading.get()) {
                    int size = testee.getIndexers().size();
                    int enabledSize = testee.getEnabledIndexers().size();
                    reads.incrementAndGet();
                    firstReadDone.countDown();
                    if (size != INDEXER_COUNT || enabledSize != INDEXER_COUNT - 1) {
                        synchronized (unexpectedSizes) {
                            unexpectedSizes.add(size);
                        }
                    }
                }
            });
            //Without this a reader thread starting late on a slow machine would miss all reloads
            assertThat(firstReadDone.await(10, TimeUnit.SECONDS)).isTrue();
            for (int i = 0; i < 10; i++) {
                testee.loadIndexers(indexerConfigs);
            }
            loading.set(false);
            //Rethrows any exception thrown while reading, e.g. a ConcurrentModificationException
            reader.get(10, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        assertThat(reads.get()).isGreaterThan(0);
        assertThat(unexpectedSizes).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void shouldStoreApiHitsRegisteredFromSeveralThreads() throws Exception {
        int threads = 4;
        int hitsPerThread = 1000;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        try {
            List<Future<?>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                futures.add(executor.submit(() -> {
                    for (int j = 0; j < hitsPerThread; j++) {
                        testee.registerApiHitLimits("indexer1", 1);
                    }
                }));
            }
            for (Future<?> future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdownNow();
        }

        testee.loadIndexers(indexerConfigs);

        ArgumentCaptor<List<IndexerApiAccessEntityShort>> captor = ArgumentCaptor.forClass(List.class);
        verify(shortRepository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(threads * hitsPerThread);
    }

}
