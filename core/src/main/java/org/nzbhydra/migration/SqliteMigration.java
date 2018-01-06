package org.nzbhydra.migration;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Sets;
import joptsimple.internal.Strings;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.downloading.NzbDownloadEntity;
import org.nzbhydra.downloading.NzbDownloadRepository;
import org.nzbhydra.downloading.NzbDownloadStatus;
import org.nzbhydra.indexers.IndexerAccessResult;
import org.nzbhydra.indexers.IndexerApiAccessEntity;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerStatusEntity;
import org.nzbhydra.logging.ProgressLogger;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.migration.FromPythonMigration.MigrationMessageEvent;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.IdentifierKeyValuePair;
import org.nzbhydra.searching.SearchEntity;
import org.nzbhydra.searching.SearchRepository;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultRepository;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class SqliteMigration {

    private static final Logger logger = LoggerFactory.getLogger(SqliteMigration.class);

    protected Connection connection;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private IndexerRepository indexerRepository;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private NzbDownloadRepository downloadRepository;
    @Autowired
    private CategoryProvider categoryProvider;
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    private Random random = new Random();

    protected ObjectMapper objectMapper = new ObjectMapper();
    protected TypeReference<List<Map<String, Object>>> listOfMapsTypeReference = new TypeReference<List<Map<String, Object>>>() {
    };

    @Transactional
    public List<String> migrate(String databaseFolder, List<String> migrationMessages) throws IOException, SQLException {
        try (Connection innerConnection = DriverManager.getConnection("jdbc:sqlite:" + databaseFolder)) {
            connection = innerConnection;
            logger.warn("Deleting all indexers, indexer searches, searches, downloads and API accesses from database");

            try {
                entityManager.createNativeQuery("SET REFERENTIAL_INTEGRITY FALSE").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE INDEXERAPIACCESS").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE indexersearch").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE search").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE indexerstatus").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE indexernzbdownload").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE SEARCHRESULT").executeUpdate();
                entityManager.createNativeQuery("TRUNCATE TABLE indexer").executeUpdate();
            } finally {
                entityManager.createNativeQuery("SET REFERENTIAL_INTEGRITY TRUE").executeUpdate();
            }
            migrate();

        }
        return migrationMessages;
    }

    protected void migrate() throws SQLException, IOException {
        logger.info("Starting database migration");
        eventPublisher.publishEvent(new MigrationMessageEvent("Starting database migration"));
        Map<Integer, IndexerEntity> oldIdToIndexersMap = migrateIndexers();
        Map<Integer, SearchEntity> oldIdToSearchesMap = migrateSearches();

        Statement statement = connection.createStatement();
        int databaseVersion = statement.executeQuery("SELECT version FROM versioninfo LIMIT 1").getInt(1);
        if (databaseVersion != 21) {
            logger.error("Expected database version 21 but got {}", databaseVersion);
            throw new SQLException("Expected database version 21 but got " + databaseVersion);
        }

        migrateIndexerApiAccesses(oldIdToIndexersMap);
        migrateIndexerSearches(oldIdToIndexersMap, oldIdToSearchesMap);
        migrateDownloads(oldIdToIndexersMap);

        logger.info("Finished database migration");
    }

    private void migrateDownloads(Map<Integer, IndexerEntity> oldIdToIndexersMap) throws SQLException {
        Statement statement = connection.createStatement();
        int countDownloads = getCount(statement, "INDEXERNZBDOWNLOAD");
        logger.info("Migrating {} downloads from old database", countDownloads);
        eventPublisher.publishEvent(new MigrationMessageEvent("Migrating " + countDownloads + " NZB download entries"));
        ResultSet oldDownloads = statement.executeQuery("SELECT * FROM indexernzbdownload LEFT JOIN indexerapiaccess ON indexernzbdownload.apiAccess_id = indexerapiaccess.id");
        List<NzbDownloadEntity> downloadEntities = new ArrayList<>();
        List<SearchResultEntity> dummySearchResultEntities = new ArrayList<>();
        while (oldDownloads.next()) {
            NzbDownloadEntity entity = new NzbDownloadEntity();
            entity.setTime(oldDownloads.getTimestamp("time").toInstant());
            IndexerEntity indexerEntity = oldIdToIndexersMap.get(oldDownloads.getInt("indexer_id"));
            entity.setError(oldDownloads.getString("error"));
            entity.setUsername(oldDownloads.getString("username"));
            entity.setAccessSource(oldDownloads.getBoolean("internal") ? SearchSource.INTERNAL : SearchSource.API);
            entity.setNzbAccessType(oldDownloads.getString("mode").equals("redirect") ? NzbAccessType.REDIRECT : NzbAccessType.PROXY);
            entity.setStatus(NzbDownloadStatus.NONE);
            Instant dummyTime = Instant.now().minus(10000, ChronoUnit.DAYS);
            String title = oldDownloads.getString("title");
            SearchResultEntity searchResultEntity = new SearchResultEntity(indexerEntity, dummyTime, title, "", String.valueOf(random.nextInt()), null, null, dummyTime);//Must set a random link because the calculator would always return the same ID
            entity.setSearchResult(searchResultEntity);
            dummySearchResultEntities.add(searchResultEntity);
            downloadEntities.add(entity);
        }
        searchResultRepository.save(dummySearchResultEntities);
        downloadRepository.save(downloadEntities);

        logger.info("Successfully migrated downloads from old database");
        eventPublisher.publishEvent(new MigrationMessageEvent("Successfully migrated NZB download entries"));
    }

    private int getCount(Statement statement, final String table) throws SQLException {
        ResultSet countQuery = statement.executeQuery("select count(*) as total from " + table);
        countQuery.next();
        return countQuery.getInt("total");
    }

    private void migrateIndexerApiAccesses(Map<Integer, IndexerEntity> oldIdToIndexersMap) throws SQLException {
        Statement statement = connection.createStatement();
        int countIndexerApiAccesses = getCount(statement, "INDEXERAPIACCESS");
        logger.info("Migrating {} indexer API accesses from old database", countIndexerApiAccesses);
        eventPublisher.publishEvent(new MigrationMessageEvent("Migrating " + countIndexerApiAccesses + " indexer API access entries"));
        ResultSet oldIndexerApiAccesses = statement.executeQuery("SELECT * FROM INDEXERAPIACCESS");
        int countMigrated = 1;
        IndexerApiAccessEntity entity;
        ProgressLogger progressLogger = new ProgressLogger(logger, 5, TimeUnit.SECONDS);
        progressLogger.expectedUpdates = countIndexerApiAccesses;
        progressLogger.start();

        while (oldIndexerApiAccesses.next()) {
            entity = new IndexerApiAccessEntity();
            entity.setIndexer(oldIdToIndexersMap.get(oldIndexerApiAccesses.getInt("indexer_id")));
            entity.setTime(oldIndexerApiAccesses.getTimestamp("time").toInstant());
            Object responseTime = oldIndexerApiAccesses.getObject("response_time");
            entity.setResponseTime(responseTime != null ? ((Integer) responseTime).longValue() : null);
            String error = oldIndexerApiAccesses.getString("error");
            entity.setError(error != null ? error.substring(0, Math.min(4000, error.length())) : null);
            entity.setAccessType(null);
            entity.setResult(oldIndexerApiAccesses.getBoolean("response_successful") ? IndexerAccessResult.SUCCESSFUL : IndexerAccessResult.CONNECTION_ERROR); //Close enough
            entity.setAccessType(IndexerApiAccessType.valueOf(oldIndexerApiAccesses.getString("type").toUpperCase()));
            entityManager.persist(entity);
            progressLogger.lightUpdate();

            if (countMigrated++ % 50 == 0) {
                entityManager.flush();
                entityManager.clear();
            }
        }
        progressLogger.stop();
        statement.close();
        entityManager.flush();
        entityManager.clear();
        eventPublisher.publishEvent(new MigrationMessageEvent("Successfully migrated indexer API accesses from old database"));
        logger.info("Successfully migrated indexer API accesses from old database");
    }

    private Map<Integer, IndexerEntity> migrateIndexers() throws SQLException {
        Statement statement = connection.createStatement();
        int countIndexers = getCount(statement, "INDEXER");
        logger.info("Migrating {} indexers from old database", countIndexers);
        eventPublisher.publishEvent(new MigrationMessageEvent("Migrating " + countIndexers + " indexer entries"));
        ResultSet indexersResultSet = statement.executeQuery("SELECT * FROM indexer");
        Map<Integer, IndexerEntity> oldIdToIndexersMap = new HashMap<>();
        while (indexersResultSet.next()) {
            IndexerEntity entity = new IndexerEntity();
            entity.setName(indexersResultSet.getString("name"));
            entity.setStatus(new IndexerStatusEntity());
            logger.debug("Migrating indexer {}", entity);
            entity = indexerRepository.save(entity);
            oldIdToIndexersMap.put(indexersResultSet.getInt("id"), entity);
        }
        logger.info("Successfully migrated indexers from old database");
        eventPublisher.publishEvent(new MigrationMessageEvent("Successfully migrated indexers from old database"));
        return oldIdToIndexersMap;
    }

    protected void migrateIndexerSearches(Map<Integer, IndexerEntity> oldIdToIndexersMap, Map<Integer, SearchEntity> oldIdToSearchesMap) throws SQLException {
        Statement statement = connection.createStatement();
        int countIndexerSearches = getCount(statement, "INDEXERSEARCH");
        int countMigrated = 1;
        logger.info("Migrating {} indexer searches from old database", countIndexerSearches);
        eventPublisher.publishEvent(new MigrationMessageEvent("Migrating " + countIndexerSearches + " indexer search entries"));
        ResultSet oldIndexerSearch = statement.executeQuery("SELECT * FROM INDEXERSEARCH");
        IndexerSearchEntity newEntity;
        ProgressLogger progressLogger = new ProgressLogger(logger, 5, TimeUnit.SECONDS);
        progressLogger.expectedUpdates = countIndexerSearches;
        progressLogger.start();
        while (oldIndexerSearch.next()) {
            newEntity = new IndexerSearchEntity();
            newEntity.setSuccessful(oldIndexerSearch.getBoolean("successful"));
            newEntity.setIndexerEntity(oldIdToIndexersMap.get(oldIndexerSearch.getInt("indexer_id")));
            newEntity.setSearchEntity(oldIdToSearchesMap.get(oldIndexerSearch.getInt("search_id")));
            newEntity.setUniqueResults(oldIndexerSearch.getInt("uniqueResults"));
            newEntity.setProcessedResults(oldIndexerSearch.getInt("processedResults"));
            newEntity.setResultsCount(oldIndexerSearch.getInt("resultsCount"));
            entityManager.persist(newEntity);
            progressLogger.lightUpdate();

            if (countMigrated++ % 50 == 0) {
                entityManager.flush();
                entityManager.clear();
            }
        }
        statement.close();
        entityManager.flush();
        entityManager.clear();
        progressLogger.stop();

        logger.info("Successfully migrated indexer searches from old database");
        eventPublisher.publishEvent(new MigrationMessageEvent("Successfully migrated indexer searches from old database"));
    }

    protected Map<Integer, SearchEntity> migrateSearches() throws SQLException {
        Map<Integer, SearchEntity> oldIdToNewEntity = new HashMap<>();
        Map<String, String> categoryMap = categoryProvider.getCategories().stream().map(Category::getName).collect(Collectors.toMap(x -> x.replace(" ", "").toLowerCase(), Function.identity()));
        Map<String, SearchType> oldTypeToNewMap = new HashMap<>();
        oldTypeToNewMap.put("general", SearchType.SEARCH);
        oldTypeToNewMap.put("book", SearchType.BOOK);
        oldTypeToNewMap.put("movie", SearchType.MOVIE);
        oldTypeToNewMap.put("tv", SearchType.TVSEARCH);
        oldTypeToNewMap.put("audio", SearchType.MUSIC);
        Map<String, IdType> oldIdTypeToNewMap = new HashMap<>();
        oldIdTypeToNewMap.put("rid", IdType.TVRAGE);
        oldIdTypeToNewMap.put("tvdbid", IdType.TVDB);
        oldIdTypeToNewMap.put("imdbid", IdType.IMDB);
        oldIdTypeToNewMap.put("tmdbid", IdType.TMDB);
        Statement statement = connection.createStatement();
        int searches = getCount(statement, "search");
        logger.info("Migrating {} searches from old database", searches);
        eventPublisher.publishEvent(new MigrationMessageEvent("Migrating " + searches + " search entries"));
        ResultSet oldSearches = statement.executeQuery("SELECT * FROM search");
        boolean hasAuthor = hasColumn(oldSearches, "author");
        boolean hasTitle = hasColumn(oldSearches, "title");
        int skippedSearches = 0;
        while (oldSearches.next()) {
            try {
                SearchEntity entity = new SearchEntity();
                String oldCategory = oldSearches.getString("category");
                String newCategory = (!Strings.isNullOrEmpty(oldCategory) && categoryMap.containsKey(oldCategory.toLowerCase())) ? categoryMap.get(oldCategory.toLowerCase()) : "All";
                entity.setCategoryName(newCategory);
                entity.setUsername(oldSearches.getString("username"));
                entity.setSeason(oldSearches.getObject("season") != null ? oldSearches.getInt("season") : null);
                entity.setEpisode(oldSearches.getString("episode"));
                entity.setQuery(oldSearches.getString("query"));
                if (hasAuthor) {
                    entity.setAuthor(oldSearches.getString("author"));
                }
                if (hasTitle) {
                    entity.setTitle(oldSearches.getString("title"));
                }
                entity.setSearchType(oldTypeToNewMap.getOrDefault(oldSearches.getString("type"), SearchType.SEARCH));

                if (oldSearches.getString("identifier_key") != null && oldSearches.getString("identifier_value") != null && oldIdTypeToNewMap.containsKey(oldSearches.getString("identifier_key"))) {
                    String identifierKey = oldIdTypeToNewMap.get(oldSearches.getString("identifier_key")).name();
                    IdentifierKeyValuePair keyValuePair = new IdentifierKeyValuePair(identifierKey, oldSearches.getString("identifier_value"));
                    entity.setIdentifiers(Sets.newHashSet(keyValuePair));
                }
                entity.setSource((oldSearches.getBoolean("internal")) ? SearchSource.INTERNAL : SearchSource.API);
                entity.setTime(oldSearches.getTimestamp("time").toInstant());
                oldIdToNewEntity.put(oldSearches.getInt("id"), entity);

            } catch (SQLException e) {
                logger.error("Problem while migrating search", e);
                skippedSearches++;
            }
        }
        logger.info("Saving search entities to database");
        searchRepository.save(oldIdToNewEntity.values());
        if (skippedSearches > 0) {
            String message = "Skipped " + skippedSearches + " of " + (skippedSearches + oldIdToNewEntity.size()) + " searches because the database entries could not be read";
            logger.warn(message);
            eventPublisher.publishEvent(new MigrationMessageEvent(message));
        } else {
            logger.info("Successfully migrated searches from old database");
            eventPublisher.publishEvent(new MigrationMessageEvent("Successfully migrated searches from old database"));
        }
        return oldIdToNewEntity;
    }

    private boolean hasColumn(ResultSet rs, String columnName) throws SQLException {
        ResultSetMetaData rsmd = rs.getMetaData();
        int columns = rsmd.getColumnCount();
        for (int x = 1; x <= columns; x++) {
            if (columnName.equals(rsmd.getColumnName(x))) {
                return true;
            }
        }
        return false;
    }


}
