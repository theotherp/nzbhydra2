package org.nzbhydra.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.IndexerApiAccessEntity;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.indexers.status.IndexerLimit;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.searching.SearchModuleConfigProvider;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntity;
import org.nzbhydra.searching.uniqueness.IndexerUniquenessScoreEntityRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.junit.jupiter.SpringExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SuppressWarnings("SpringJavaAutowiringInspection")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
public class ConfigWebTest {

    @Autowired
    private ConfigWeb configWeb;

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;

    @Autowired
    private SearchModuleProvider searchModuleProvider;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private IndexerApiAccessRepository apiAccessRepository;

    @Autowired
    private IndexerSearchRepository indexerSearchRepository;

    @Autowired
    private SearchRepository searchRepository;

    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerLimitRepository indexerLimitRepository;

    @Autowired
    private IndexerUniquenessScoreEntityRepository indexerUniquenessScoreRepository;

    private IndexerConfig indexerConfig1;
    private IndexerConfig indexerConfig2;

    @BeforeEach
    public void setUp() {
        indexerConfig1 = new IndexerConfig();
        indexerConfig1.setName("indexer1");
        indexerConfig1.setSearchModuleType(SearchModuleType.NEWZNAB);
        indexerConfig1.setState(IndexerConfig.State.ENABLED);
        indexerConfig1.setHost("http://somehost1.com");

        indexerConfig2 = new IndexerConfig();
        indexerConfig2.setName("indexer2");
        indexerConfig2.setSearchModuleType(SearchModuleType.NEWZNAB);
        indexerConfig2.setState(IndexerConfig.State.ENABLED);
        indexerConfig2.setHost("http://somehost2.com");

        searchModuleConfigProvider.setIndexers(Arrays.asList(indexerConfig1, indexerConfig2));
        searchModuleProvider.loadIndexers(Arrays.asList(indexerConfig1, indexerConfig2));
    }

    @Test
    void shouldDeleteIndexerAndRelatedDataWhenRemovedFromConfig() throws Exception {
        // Given: Two indexers with related data
        IndexerEntity indexer1 = indexerRepository.findByName("indexer1");
        IndexerEntity indexer2 = indexerRepository.findByName("indexer2");

        // Create API access entries
        IndexerApiAccessEntity apiAccess1 = new IndexerApiAccessEntity(indexer1);
        apiAccess1.setTime(Instant.now());
        apiAccessRepository.save(apiAccess1);

        IndexerApiAccessEntity apiAccess2 = new IndexerApiAccessEntity(indexer2);
        apiAccess2.setTime(Instant.now());
        apiAccessRepository.save(apiAccess2);

        // Create search results
        SearchResultEntity searchResult1 = new SearchResultEntity(indexer1, Instant.now(), "title1", "guid1", "link1", "details1", DownloadType.NZB, Instant.now());
        searchResultRepository.save(searchResult1);

        SearchResultEntity searchResult2 = new SearchResultEntity(indexer2, Instant.now(), "title2", "guid2", "link2", "details2", DownloadType.NZB, Instant.now());
        searchResultRepository.save(searchResult2);

        // Update existing indexer limits (created by SearchModuleProvider.loadIndexers)
        IndexerLimit limit1 = indexerLimitRepository.findByIndexer(indexer1);
        limit1.setApiHits(10);
        indexerLimitRepository.save(limit1);

        IndexerLimit limit2 = indexerLimitRepository.findByIndexer(indexer2);
        limit2.setApiHits(20);
        indexerLimitRepository.save(limit2);

        // Create indexer search entities
        SearchEntity search = new SearchEntity();
        search.setTime(Instant.now());
        searchRepository.save(search);

        IndexerSearchEntity indexerSearch1 = new IndexerSearchEntity(indexer1, search, 0);
        indexerSearch1.setSuccessful(true);
        indexerSearchRepository.save(indexerSearch1);

        IndexerSearchEntity indexerSearch2 = new IndexerSearchEntity(indexer2, search, 0);
        indexerSearch2.setSuccessful(true);
        indexerSearchRepository.save(indexerSearch2);

        // Create uniqueness score entities
        IndexerUniquenessScoreEntity uniquenessScore1 = new IndexerUniquenessScoreEntity(indexer1, 5, 3, true);
        indexerUniquenessScoreRepository.save(uniquenessScore1);

        IndexerUniquenessScoreEntity uniquenessScore2 = new IndexerUniquenessScoreEntity(indexer2, 4, 2, true);
        indexerUniquenessScoreRepository.save(uniquenessScore2);

        // Verify initial state
        assertThat(indexerRepository.count()).isEqualTo(2);
        assertThat(apiAccessRepository.count()).isEqualTo(2);
        assertThat(searchResultRepository.count()).isEqualTo(2);
        assertThat(indexerLimitRepository.count()).isEqualTo(2);
        assertThat(indexerSearchRepository.count()).isEqualTo(2);
        assertThat(indexerUniquenessScoreRepository.count()).isEqualTo(2);

        // When: Remove indexer2 from config
        BaseConfig newConfig = createNewConfigWithIndexers(new ArrayList<>(Collections.singletonList(indexerConfig1)));

        configWeb.setConfig(newConfig);

        // Then: indexer2 and all its related data should be deleted
        assertThat(indexerRepository.count()).isEqualTo(1);
        assertThat(indexerRepository.findByName("indexer1")).isNotNull();
        assertThat(indexerRepository.findByName("indexer2")).isNull();

        // Related data for indexer2 should be deleted
        assertThat(apiAccessRepository.count()).isEqualTo(1);
        assertThat(searchResultRepository.count()).isEqualTo(1);
        assertThat(indexerLimitRepository.count()).isEqualTo(1);
        assertThat(indexerSearchRepository.count()).isEqualTo(1);
        assertThat(indexerUniquenessScoreRepository.count()).isEqualTo(1);

        // Verify remaining data belongs to indexer1
        assertThat(searchResultRepository.findAll().get(0).getIndexer().getName()).isEqualTo("indexer1");
    }

    @Test
    void shouldDeleteAllIndexersAndRelatedDataWhenAllRemovedFromConfig() throws Exception {
        // Given: Two indexers with related data
        IndexerEntity indexer1 = indexerRepository.findByName("indexer1");
        IndexerEntity indexer2 = indexerRepository.findByName("indexer2");

        // Create API access entries
        apiAccessRepository.save(new IndexerApiAccessEntity(indexer1));
        apiAccessRepository.save(new IndexerApiAccessEntity(indexer2));

        // Create search results
        searchResultRepository.save(new SearchResultEntity(indexer1, Instant.now(), "title1", "guid1", "link1", "details1", DownloadType.NZB, Instant.now()));
        searchResultRepository.save(new SearchResultEntity(indexer2, Instant.now(), "title2", "guid2", "link2", "details2", DownloadType.NZB, Instant.now()));

        // Verify initial state
        assertThat(indexerRepository.count()).isEqualTo(2);
        assertThat(apiAccessRepository.count()).isEqualTo(2);
        assertThat(searchResultRepository.count()).isEqualTo(2);

        // When: Remove all indexers from config
        BaseConfig newConfig = createNewConfigWithIndexers(Collections.emptyList());

        configWeb.setConfig(newConfig);

        // Then: All indexers and related data should be deleted
        assertThat(indexerRepository.count()).isEqualTo(0);
        assertThat(apiAccessRepository.count()).isEqualTo(0);
        assertThat(searchResultRepository.count()).isEqualTo(0);
    }

    @Test
    void shouldNotDeleteIndexerWhenStillInConfig() throws Exception {
        // Given: Two indexers with related data
        IndexerEntity indexer1 = indexerRepository.findByName("indexer1");
        IndexerEntity indexer2 = indexerRepository.findByName("indexer2");

        searchResultRepository.save(new SearchResultEntity(indexer1, Instant.now(), "title1", "guid1", "link1", "details1", DownloadType.NZB, Instant.now()));
        searchResultRepository.save(new SearchResultEntity(indexer2, Instant.now(), "title2", "guid2", "link2", "details2", DownloadType.NZB, Instant.now()));

        assertThat(indexerRepository.count()).isEqualTo(2);
        assertThat(searchResultRepository.count()).isEqualTo(2);

        // When: Config contains both indexers (no change)
        BaseConfig newConfig = createNewConfigWithIndexers(Arrays.asList(indexerConfig1, indexerConfig2));

        configWeb.setConfig(newConfig);

        // Then: No indexers should be deleted
        assertThat(indexerRepository.count()).isEqualTo(2);
        assertThat(searchResultRepository.count()).isEqualTo(2);
    }

    private BaseConfig createNewConfigWithIndexers(List<IndexerConfig> indexers) {
        BaseConfig newConfig = new BaseConfig();
        // Copy essential config from the current config
        BaseConfig currentConfig = configProvider.getBaseConfig();
        newConfig.setMain(currentConfig.getMain());
        newConfig.setAuth(currentConfig.getAuth());
        newConfig.setCategoriesConfig(currentConfig.getCategoriesConfig());
        newConfig.setDownloading(currentConfig.getDownloading());
        newConfig.setSearching(currentConfig.getSearching());
        newConfig.setExternalTools(currentConfig.getExternalTools());
        newConfig.setIndexers(indexers);
        return newConfig;
    }
}
