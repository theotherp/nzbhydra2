package org.nzbhydra.historystats;

import org.nzbhydra.historystats.stats.HistoryRequestData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.stream.Collectors;

@Component
public class History {

    private static final Logger logger = LoggerFactory.getLogger(History.class);

    @PersistenceContext
    private EntityManager entityManager;

    public Page getHistory(HistoryRequestData requestData, String tableName, Class resultClass) {
        Map<String, Object> parameters = new HashMap<>();

        List<String> wheres = new ArrayList<>();
        String sort = "";

        for (Entry<String, FilterDefinition> columnAndFilterDefinition : requestData.getFilterModel().entrySet()) {
            Object filterValue = columnAndFilterDefinition.getValue().getFilterValue();
            Object filterType = columnAndFilterDefinition.getValue().getFilterType();
            String columnName = columnAndFilterDefinition.getKey();
            if (filterType.equals("freetext")) {
                wheres.add(String.format("%s LIKE :%s", columnName, columnName));
                parameters.put(columnName, "%" + filterValue + "%");
            } else if (filterType.equals("checkboxes")) {
                //TODO isBoolean?
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
        if (sortModel != null) {
            sort = String.format(" order by %s %s nulls last ", sortModel.getColumn(), sortModel.getSortMode() == 1 ? "ASC" : "DESC");
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
}
