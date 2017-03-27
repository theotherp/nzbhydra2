package org.nzbhydra.web;

import com.healthmarketscience.sqlbuilder.BinaryCondition;
import com.healthmarketscience.sqlbuilder.Condition;
import com.healthmarketscience.sqlbuilder.InCondition;
import com.healthmarketscience.sqlbuilder.OrderObject.Dir;
import com.healthmarketscience.sqlbuilder.SelectQuery;
import org.nzbhydra.database.NzbDownloadEntity;
import org.nzbhydra.database.SearchEntity;
import org.nzbhydra.web.mapping.FilterDefinition;
import org.nzbhydra.web.mapping.HistoryRequestData;
import org.nzbhydra.web.mapping.SortModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.math.BigInteger;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

@RestController
public class History {

    private static final Logger logger = LoggerFactory.getLogger(History.class);

    @PersistenceContext
    private EntityManager entityManager;


    @RequestMapping(value = "/internalapi/history/searches", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page searchHistory(@RequestBody HistoryRequestData requestData) {
        //TODO Distinct(Group by): Implement this by getting pages and doing naive grouping because fucking JPA doesn't support grouping and pages

        return getHistory(requestData, "SEARCH", SearchEntity.class);
    }

    private Page getHistory(HistoryRequestData requestData, String tableName, Class resultClass) {
        SelectQuery searchQueryBuilder = (new SelectQuery()).addCustomFromTable(tableName).addAllColumns();
        SelectQuery countQueryBuilder = (new SelectQuery()).addCustomFromTable(tableName);

        for (Entry<String, FilterDefinition> columnAndFilterDefinition : requestData.getFilterModel().entrySet()) {
            Object filterValue = columnAndFilterDefinition.getValue().getFilterValue();
            Object filterType = columnAndFilterDefinition.getValue().getFilterType();
            String columnName = columnAndFilterDefinition.getKey();
            Condition condition = null;
            if (filterType.equals("freetext")) {
                searchQueryBuilder.addCondition(BinaryCondition.like(columnName, filterValue));
            } else if (filterType.equals("checkboxes")) {
                //TODO isBoolean?
                condition = new InCondition(columnName, columnAndFilterDefinition.getValue().getFilterValue());
            } else if (filterType.equals("boolean") && !"all".equals(filterValue)) {
                condition = BinaryCondition.equalTo(columnName, Boolean.parseBoolean(String.valueOf(filterValue)));
            } else if (filterType.equals("time")) {
                Map<String, String> beforeAndAfter = (Map<String, String>) columnAndFilterDefinition.getValue().getFilterValue();
                if (beforeAndAfter.get("before") != null) {
                    condition = BinaryCondition.lessThan(columnName, Instant.parse(beforeAndAfter.get("before")));
                }
                if (beforeAndAfter.get("after") != null) {
                    condition = BinaryCondition.greaterThan(columnName, Instant.parse(beforeAndAfter.get("after")));
                }
            }
            if (condition != null) {
                searchQueryBuilder.addCondition(condition);
                countQueryBuilder.addCondition(condition);
            }
        }
        SortModel sortModel = requestData.getSortModel();
        if (sortModel != null) {
            searchQueryBuilder.addCustomOrdering(sortModel.getColumn(), sortModel.getSortMode() == 1 ? Dir.ASCENDING : Dir.DESCENDING);
        }

        String selectQuerySql = searchQueryBuilder.toString();
        if (sortModel != null) {
            selectQuerySql += " NULLS LAST";
        }
        logger.debug("Constructed query: {}", selectQuerySql);

        //I was unable to find out how to add the count function so I have to hack it...
        String countQuerySql = countQueryBuilder.addCustomColumns("XXX").toString().replace("'XXX'", "count(*)");

        Query selectQuery = entityManager.createNativeQuery(selectQuerySql, resultClass);
        Query countQuery = entityManager.createNativeQuery(countQuerySql);

        List resultList = selectQuery.getResultList();
        Pageable pageable = new PageRequest(requestData.getPage(), requestData.getLimit());

        BigInteger count = (BigInteger) countQuery.getSingleResult();
        return new PageImpl<>(resultList, pageable, count.longValue());
    }


    @RequestMapping(value = "/internalapi/history/downloads", method = RequestMethod.POST, produces = MediaType.APPLICATION_JSON_VALUE, consumes = MediaType.APPLICATION_JSON_VALUE)
    public Page downloadHistory(@RequestBody HistoryRequestData requestData) {
        return getHistory(requestData, "INDEXERNZBDOWNLOAD", NzbDownloadEntity.class);
    }

}
