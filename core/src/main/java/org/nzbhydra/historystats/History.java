package org.nzbhydra.historystats;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.Hibernate;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.historystats.HistoryQueryBuilder.HistoryQuery;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.web.SessionStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map.Entry;
import java.util.Optional;
import java.util.Set;

@SuppressWarnings("unchecked")
@Component
public class History {

    public static final String DOWNLOAD_TABLE = "INDEXERNZBDOWNLOAD x left join SEARCHRESULT s on x.SEARCH_RESULT_ID = s.ID LEFT JOIN INDEXER i ON s.INDEXER_ID = i.ID";
    public static final String SEARCH_TABLE = "SEARCH x";
    public static final String NOTIFICATION_TABLE = "NOTIFICATION x";

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;
    @Autowired
    private ConfigProvider configProvider;

    /**
     * Returns one page of the given history table. The request comes straight from clients, so all of it goes through
     * {@link HistoryQueryBuilder}: columns are checked against an allow-list and values are bound as parameters.
     *
     * @throws InvalidHistoryRequestException if the request names an unknown column or carries an invalid value
     */
    @Transactional
    public <T> Page<T> getHistory(HistoryRequest requestData, String tableName, Class<T> resultClass) {
        HistoryQuery historyQuery = HistoryQueryBuilder.build(requestData, tableName);

        String paging = String.format(" LIMIT %d OFFSET %d", historyQuery.limit(), historyQuery.offset());
        String selectQuerySql = "SELECT x.* FROM " + tableName + historyQuery.whereConditions() + historyQuery.orderBy() + paging;
        String countQuerySql = "SELECT COUNT(x.*) FROM " + tableName + historyQuery.whereConditions();

        Query selectQuery = entityManager.createNativeQuery(selectQuerySql, resultClass);
        Query countQuery = entityManager.createNativeQuery(countQuerySql);

        for (Entry<String, Object> entry : historyQuery.parameters().entrySet()) {
            selectQuery.setParameter(entry.getKey(), entry.getValue());
            countQuery.setParameter(entry.getKey(), entry.getValue());
        }

        List resultList = selectQuery.getResultList();
        SortModel sortModel = requestData.getSortModel();
        Pageable pageable;
        if (sortModel == null || sortModel.getColumn() == null) {
            pageable = PageRequest.of(requestData.getPage() - 1, requestData.getLimit());
        } else {
            pageable = PageRequest.of(requestData.getPage() - 1, requestData.getLimit(), Integer.valueOf(1).equals(sortModel.getSortMode()) ? Sort.Direction.ASC : Sort.Direction.DESC, sortModel.getColumn());
        }

        Long count = (Long) countQuery.getSingleResult();
        if (resultClass == SearchEntity.class) {
            resultList.forEach(x -> Hibernate.initialize(((SearchEntity) x).getIdentifiers()));
        } else if (resultClass == FileDownloadEntity.class) {
            Hibernate.initialize(resultList);
            resultList.forEach(x -> Hibernate.initialize(((FileDownloadEntity) x).getSearchResult()));

        }
        return new PageImpl<>(resultList, pageable, count);
    }

    public List<SearchEntity> getHistoryForSearching() {
        String currentUserName = SessionStorage.username.get();
        if (currentUserName == null && configProvider.getBaseConfig().getAuth().isAuthConfigured()) {
            //Auth is configured but the caller is not logged in: never show the searches of other users
            return new ArrayList<>();
        }
        //Without auth everybody is anonymous and it's effectively a single-user installation, so all searches are shown
        Page<SearchEntity> history = currentUserName == null ? searchRepository.findForUserSearchHistory(PageRequest.of(0, 100)) : searchRepository.findForUserSearchHistory(currentUserName, PageRequest.of(0, 100));
        List<SearchEntity> entities = new ArrayList<>();
        Set<Integer> contained = new HashSet<>();
        for (SearchEntity searchEntity : history.getContent()) {
            int hash = searchEntity.getComparingHash();
            if (contained.contains(hash)) {
                continue;
            }
            contained.add(hash);
            entities.add(searchEntity);
            if (entities.size() == configProvider.getBaseConfig().getSearching().getHistoryForSearching()) {
                break;
            }
        }

        return entities;
    }

    public SearchDetails getSearchDetails(int searchId) {
        Optional<SearchEntity> searchOptional = searchRepository.findById(searchId);
        SearchEntity search = searchOptional.get();
        Collection<IndexerSearchEntity> entities = indexerSearchRepository.findBySearchEntity(search);
        List<IndexerSearchTO> details = new ArrayList<>();
        for (IndexerSearchEntity entity : entities) {
            details.add(new IndexerSearchTO(entity.getIndexerEntity().getName(), entity.getSuccessful(), entity.getResultsCount(), entity.getResponseTime(), entity.getErrorMessage()));
        }
        return new SearchDetails(search.getUsername(), search.getIp(), search.getUserAgent(), search.getSource().name(), details);
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SearchDetails {
        String username;
        String ip;
        String userAgent;
        String source;
        List<IndexerSearchTO> indexerSearches;
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class IndexerSearchTO {
        private String indexerName;
        private boolean successful;
        private int resultsCount;
        private Long responseTime;
        private String errorMessage;
    }
}
