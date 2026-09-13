package org.nzbhydra.searching.db;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.downloading.FileDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.IndexerSearchResultOccurrenceRepository;
import org.nzbhydra.indexers.IndexerSearchResultPersistor;
import org.nzbhydra.searching.SearchModuleConfigProvider;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.SearchResultIdCalculator;
import org.nzbhydra.searching.dtoseventsenums.IndexerSearchResult;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies that search results get a sequential internal ID while the hash stays the externally visible identifier.
 */
@SuppressWarnings("SpringJavaAutowiringInspection")
@SpringBootTest(classes = NzbHydra.class)
public class SearchResultPersistenceComponentTest {

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private IndexerSearchResultOccurrenceRepository occurrenceRepository;
    @Autowired
    private FileDownloadRepository downloadRepository;
    @Autowired
    private IndexerSearchResultPersistor persistor;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Indexer<?> indexer;
    private IndexerEntity indexerEntity;

    @BeforeEach
    public void setUp() {
        deleteAllRows();
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName("indexer1");
        indexerConfig.setSearchModuleType(SearchModuleType.NEWZNAB);
        indexerConfig.setState(IndexerConfig.State.ENABLED);
        indexerConfig.setHost("somehost");
        searchModuleConfigProvider.setIndexers(List.of(indexerConfig));
        searchModuleProvider.loadIndexers(List.of(indexerConfig));
        indexer = searchModuleProvider.getIndexerByName("indexer1");
        indexerEntity = indexerRepository.findByName("indexer1");
    }

    @AfterEach
    public void tearDown() {
        //The Spring context is shared with the other component tests so the database must be left empty
        deleteAllRows();
    }

    private void deleteAllRows() {
        downloadRepository.deleteAll();
        occurrenceRepository.deleteAll();
        searchResultRepository.deleteAll();
        indexerSearchRepository.deleteAll();
        searchRepository.deleteAll();
    }

    @Test
    public void shouldAssignSequentialIdsAndStoreTheHash() {
        List<SearchResultItem> items = items("a", "b", "c");
        IndexerSearchResult indexerSearchResult = new IndexerSearchResult();

        persistor.persistSearchResults(indexer, items, indexerSearchResult);

        List<SearchResultEntity> persisted = searchResultRepository.findAll(Sort.by("id"));
        assertThat(persisted).hasSize(3);
        List<Long> ids = persisted.stream().map(SearchResultEntity::getId).toList();
        assertThat(ids.get(1)).isEqualTo(ids.get(0) + 1);
        assertThat(ids.get(2)).isEqualTo(ids.get(1) + 1);
        //A sequence starting at 1 never produces anything near a random 64 bit hash
        assertThat(ids.get(0)).isBetween(1L, 10_000L);

        for (SearchResultEntity entity : persisted) {
            assertThat(entity.getHash()).isEqualTo(SearchResultIdCalculator.calculateSearchResultHash(entity));
            assertThat(entity.getHash()).isNotEqualTo(entity.getId());
        }
        for (SearchResultItem item : items) {
            long hash = SearchResultIdCalculator.calculateSearchResultHash(item);
            assertThat(item.getSearchResultId()).isEqualTo(hash);
            assertThat(item.getGuid()).isEqualTo(hash);
            assertThat(searchResultRepository.findByHash(hash)).isPresent();
            assertThat(searchResultRepository.findByHash(hash).get().getTitle()).isEqualTo(item.getTitle());
        }
        assertThat(searchResultRepository.findByHash(123456789L)).isEmpty();
        assertThat(searchResultRepository.findAllByHashIn(List.of(SearchResultIdCalculator.calculateSearchResultHash(items.get(0)), 123456789L))).hasSize(1);
    }

    @Test
    public void shouldOnlyInsertNewResultsAndCreateOccurrencesForAll() {
        IndexerSearchResult firstSearchResult = new IndexerSearchResult();
        persistor.persistSearchResults(indexer, items("a", "b", "c"), firstSearchResult);
        persistor.persistSearchResultOccurrences(indexerSearch(), firstSearchResult.getSearchResultIds());
        assertThat(searchResultRepository.count()).isEqualTo(3);
        assertThat(occurrenceRepository.count()).isEqualTo(3);
        List<Long> firstIds = new ArrayList<>(firstSearchResult.getSearchResultIds());

        IndexerSearchResult secondSearchResult = new IndexerSearchResult();
        List<SearchResultItem> secondItems = items("a", "b", "c", "d");
        persistor.persistSearchResults(indexer, secondItems, secondSearchResult);
        IndexerSearchEntity secondIndexerSearch = indexerSearch();
        persistor.persistSearchResultOccurrences(secondIndexerSearch, secondSearchResult.getSearchResultIds());

        assertThat(searchResultRepository.count()).isEqualTo(4);
        assertThat(secondSearchResult.getSearchResultEntities()).hasSize(1);
        assertThat(secondSearchResult.getSearchResultEntities().iterator().next().getTitle()).isEqualTo("title d");
        assertThat(secondSearchResult.getExistingSearchResultIds()).containsExactlyInAnyOrderElementsOf(firstIds);
        assertThat(secondSearchResult.getSearchResultIds()).hasSize(4);
        assertThat(occurrenceRepository.count()).isEqualTo(7);
        assertThat(occurrenceRepository.findByIndexerSearchSearchEntityId(secondIndexerSearch.getSearchEntity().getId())).hasSize(4);
        //The externally visible ID of an already known result is still its hash
        assertThat(secondItems.get(0).getSearchResultId()).isEqualTo(SearchResultIdCalculator.calculateSearchResultHash(secondItems.get(0)));
    }

    @Test
    public void shouldHaveTheSequence() {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM INFORMATION_SCHEMA.SEQUENCES WHERE SEQUENCE_NAME = 'SEARCHRESULT_SEQ'", Integer.class);
        assertThat(count).isEqualTo(1);
    }

    private IndexerSearchEntity indexerSearch() {
        SearchEntity searchEntity = searchRepository.save(new SearchEntity());
        IndexerSearchEntity indexerSearchEntity = new IndexerSearchEntity();
        indexerSearchEntity.setIndexerEntity(indexerEntity);
        indexerSearchEntity.setSearchEntity(searchEntity);
        return indexerSearchRepository.save(indexerSearchEntity);
    }

    private List<SearchResultItem> items(String... suffixes) {
        return Arrays.stream(suffixes).map(this::item).toList();
    }

    private SearchResultItem item(String suffix) {
        SearchResultItem item = new SearchResultItem();
        item.setIndexer(indexer);
        item.setTitle("title " + suffix);
        item.setIndexerGuid("guid " + suffix);
        item.setLink("link " + suffix);
        item.setDetails("details " + suffix);
        item.setDownloadType(DownloadType.NZB);
        item.setPubDate(Instant.now());
        return item;
    }
}
