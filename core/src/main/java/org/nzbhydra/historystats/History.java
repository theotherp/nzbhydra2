package org.nzbhydra.historystats;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.Hibernate;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchRepository;
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
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

    @Transactional
    public <T> Page<T> getHistory(HistoryRequest requestData, String tableName, Class<T> resultClass) {
        Map<String, Object> parameters = new HashMap<>();

        List<String> wheres = new ArrayList<>();
        String sort = "";

        for (Entry<String, FilterDefinition> columnAndFilterDefinition : requestData.getFilterModel().entrySet()) {
            Object filterValue = columnAndFilterDefinition.getValue().getFilterValue();
            Object filterType = columnAndFilterDefinition.getValue().getFilterType();
            String columnName = columnAndFilterDefinition.getKey();
            if (filterType.equals("freetext")) {
                wheres.add(String.format("LOWER(%s) LIKE :%s", columnName, columnName));
                parameters.put(columnName, "%" + filterValue.toString().toLowerCase() + "%");
            } else if (filterType.equals("text")) {
                wheres.add(String.format("LOWER(%s) = :%s", columnName, columnName));
                parameters.put(columnName, filterValue.toString().toLowerCase());
            } else if (filterType.equals("checkboxes")) {
                wheres.add(String.format("%s IN :%s", columnName, columnName));
                parameters.put(columnName, filterValue);
            } else if (filterType.equals("boolean") && !"all".equals(filterValue)) {
                wheres.add(String.format("%s = :%s", columnName, columnName));
                parameters.put(columnName, filterValue);
            } else if (filterType.equals("time")) {
                Map<String, String> beforeAndAfter = (Map<String, String>) columnAndFilterDefinition.getValue().getFilterValue();
                if (beforeAndAfter.get("before") != null) {
                    wheres.add(String.format("%s < :%s", columnName, columnName));
                    parameters.put(columnName, filterValue);
                }
                if (beforeAndAfter.get("after") != null) {
                    wheres.add(String.format("%s > :%s", columnName, columnName));
                    parameters.put(columnName, filterValue);
                }
            }
        }
        SortModel sortModel = requestData.getSortModel();
        boolean useNullsLast = true;
        boolean useLower = true;
        if (sortModel != null) {
            String column = sortModel.getColumn();
            if ("time".equalsIgnoreCase(column) || "age".equalsIgnoreCase(column)) {
                useNullsLast = false;
                useLower = false;
            }
            if (useLower) {
                column = "lower(" + column + ")";
            }
            sort = String.format(" order by %s %s %s ", column, sortModel.getSortMode() == 1 ? "ASC" : "DESC", useNullsLast ? "nulls last" : "");
        }
        //Always sort by newest next so order remains stable
        if (!"time".equalsIgnoreCase(sortModel.getColumn())) {
            sort += ", time desc";
        }


        String whereConditions = "";
        if (!wheres.isEmpty()) {
            whereConditions = " WHERE " + String.join(" AND ", wheres);
        }

        String paging = String.format(" LIMIT %d OFFSET %d", requestData.getLimit(), (requestData.getPage() - 1) * requestData.getLimit());


        String selectQuerySql = "SELECT x.* FROM " + tableName + whereConditions + sort + paging;
        String countQuerySql = "SELECT COUNT(x.*) FROM " + tableName + whereConditions;

        Query selectQuery = entityManager.createNativeQuery(selectQuerySql, resultClass);
        Query countQuery = entityManager.createNativeQuery(countQuerySql);

        for (Entry<String, Object> entry : parameters.entrySet()) {
            selectQuery.setParameter(entry.getKey(), entry.getValue());
            countQuery.setParameter(entry.getKey(), entry.getValue());
        }

        List resultList = selectQuery.getResultList();
        Pageable pageable;
        if (sortModel == null) {
            pageable = PageRequest.of(requestData.getPage() - 1, requestData.getLimit());
        } else {
            pageable = PageRequest.of(requestData.getPage() - 1, requestData.getLimit(), sortModel.getSortMode() == 1 ? Sort.Direction.ASC : Sort.Direction.DESC, sortModel.getColumn());
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
            if (entities.size() == 25) {
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
            details.add(new IndexerSearchTO(entity.getIndexerEntity().getName(), entity.getSuccessful(), entity.getResultsCount()));
        }
        return new SearchDetails(search.getUsername(), search.getIp(), search.getUserAgent(), search.getSource().name(), details);
    }

    @Data
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
    @AllArgsConstructor
    @NoArgsConstructor
    public static class IndexerSearchTO {
        private String indexerName;
        private boolean successful;
        private int resultsCount;
    }
}
