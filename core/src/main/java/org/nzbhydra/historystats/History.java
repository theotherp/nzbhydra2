package org.nzbhydra.historystats;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.historystats.stats.HistoryRequestData;
import org.nzbhydra.indexers.IndexerSearchEntity;
import org.nzbhydra.indexers.IndexerSearchRepository;
import org.nzbhydra.searching.SearchEntity;
import org.nzbhydra.searching.SearchRepository;
import org.nzbhydra.web.SessionStorage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.math.BigInteger;
import java.util.*;
import java.util.Map.Entry;
import java.util.stream.Collectors;

@Component
public class History {

    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private SearchRepository searchRepository;
    @Autowired
    private IndexerSearchRepository indexerSearchRepository;

    public <T> Page<T> getHistory(HistoryRequestData requestData, String tableName, Class<T> resultClass) {
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
            if ("time".equalsIgnoreCase(column)) {
                useNullsLast = false;
                useLower = false;
            }
            if (useLower) {
                column = "lower(" + column + ")";
            }
            sort = String.format(" order by %s %s %s ", column, sortModel.getSortMode() == 1 ? "ASC" : "DESC", useNullsLast ? "nulls last" : "");
        }

        String whereConditions = "";
        if (!wheres.isEmpty()) {
            whereConditions = " WHERE " + wheres.stream().collect(Collectors.joining(" AND "));
        }

        String paging = String.format(" LIMIT %d OFFSET %d", requestData.getLimit(), (requestData.getPage() - 1) * requestData.getLimit());


        String selectQuerySql = "SELECT * FROM " + tableName + whereConditions + sort + paging;
        String countQuerySql = "SELECT COUNT(*) FROM " + tableName + whereConditions;

        Query selectQuery = entityManager.createNativeQuery(selectQuerySql, resultClass);
        Query countQuery = entityManager.createNativeQuery(countQuerySql);
        for (Entry<String, Object> entry : parameters.entrySet()) {
            selectQuery.setParameter(entry.getKey(), entry.getValue());
            countQuery.setParameter(entry.getKey(), entry.getValue());
        }

        List resultList = selectQuery.getResultList();
        Pageable pageable = new PageRequest(requestData.getPage() - 1, requestData.getLimit());

        BigInteger count = (BigInteger) countQuery.getSingleResult();
        return new PageImpl<>(resultList, pageable, count.longValue());
    }

    public List<SearchEntity> getHistoryForSearching() {
        String currentUserName = SessionStorage.username.get();
        Page<SearchEntity> history = currentUserName == null ? searchRepository.findForUserSearchHistory(new PageRequest(0, 100)) : searchRepository.findForUserSearchHistory(currentUserName, new PageRequest(0, 100));
        List<SearchEntity> entities = new ArrayList<>();
        Set<Integer> contained = new HashSet<>();
        for (SearchEntity searchEntity : history.getContent()) {
            int hash = searchEntity.getComparingHash();
            if (contained.contains(hash)) {
                continue;
            }
            contained.add(hash);
            entities.add(searchEntity);
            if (entities.size() == 15) {
                break;
            }
        }

        return entities;
    }

    public SearchDetails getSearchDetails(int searchId) {
        SearchEntity search = searchRepository.findOne(searchId);
        Collection<IndexerSearchEntity> entities = indexerSearchRepository.findBySearchEntity(search);
        List<IndexerSearchTO> details = new ArrayList<>();
        for (IndexerSearchEntity entity : entities) {
            details.add(new IndexerSearchTO(entity.getIndexerEntity().getName(), entity.getSuccessful(), entity.getResultsCount()));
        }
        return new SearchDetails(search.getUsername(), search.getIp(), search.getUserAgent(), search.getSource().name(), details);
    }


    @Data
    @AllArgsConstructor
    public static class SearchDetails {
        String username;
        String ip;
        String userAgent;
        String source;
        List<IndexerSearchTO> indexerSearches;
    }

    @Data
    @AllArgsConstructor
    public static class IndexerSearchTO {
        private String indexerName;
        private boolean successful;
        private int resultsCount;
    }
}
