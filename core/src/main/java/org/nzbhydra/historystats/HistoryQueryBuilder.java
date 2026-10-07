package org.nzbhydra.historystats;

import org.apache.commons.lang3.StringUtils;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

/**
 * Translates a client supplied {@link HistoryRequest} into the WHERE and ORDER BY parts of the native history query.
 *
 * <p>Nothing from the request is ever written into the SQL text: filter and sort columns are looked up in a per-table
 * allow-list and replaced by the SQL name stored there, every filter value is bound as a parameter with a generated
 * name ({@code p0}, {@code p1}, ...), and number and time bounds are parsed before they are bound. Anything that does
 * not pass is rejected with an {@link InvalidHistoryRequestException} instead of being ignored, so a client never gets
 * an unfiltered page that looks filtered.
 */
final class HistoryQueryBuilder {

    private static final Logger logger = LoggerFactory.getLogger(HistoryQueryBuilder.class);

    static final int MAX_LIMIT = 1000;

    private static final String TIME_COLUMN = "time";
    private static final Set<String> TEXT_FILTER_TYPES = Set.of("freetext", "text", "checkboxes", "boolean");
    private static final int MAX_LOGGED_COLUMN_LENGTH = 100;
    /**
     * Bounds that H2 can compare with any numeric column without overflowing or failing to convert the value.
     */
    private static final BigDecimal MAX_NUMBER_BOUND = BigDecimal.valueOf(Long.MAX_VALUE);
    private static final int MAX_NUMBER_SCALE = 10;
    private static final int MIN_YEAR = 1;
    private static final int MAX_YEAR = 9999;

    enum ColumnKind {
        TEXT,
        NUMBER,
        TIME
    }

    /**
     * @param sqlName the name written into the SQL; never taken from the request
     * @param kind    decides which filters apply and how the column is sorted
     */
    record HistoryColumn(String sqlName, ColumnKind kind) {
    }

    record HistoryQuery(String whereConditions, String orderBy, int limit, long offset, Map<String, Object> parameters) {
    }

    /**
     * The columns the history pages (core/ui-react: searchHistory.ts, history/downloads.ts, history/notifications.ts and
     * the sort columns in historySearchParams.ts) and the external API ({@code ExternalHistoryRequestMapper}) filter and
     * sort by. The legacy AngularJS UI used exactly the same names. Keys are matched case-insensitively.
     */
    private static final Map<String, Map<String, HistoryColumn>> COLUMNS_BY_TABLE = Map.of(
            History.SEARCH_TABLE, columns(
                    new HistoryColumn("time", ColumnKind.TIME),
                    new HistoryColumn("query", ColumnKind.TEXT),
                    new HistoryColumn("category_name", ColumnKind.TEXT),
                    new HistoryColumn("source", ColumnKind.TEXT),
                    new HistoryColumn("user_agent", ColumnKind.TEXT),
                    new HistoryColumn("username", ColumnKind.TEXT),
                    new HistoryColumn("ip", ColumnKind.TEXT)),
            History.DOWNLOAD_TABLE, columns(
                    new HistoryColumn("time", ColumnKind.TIME),
                    new HistoryColumn("name", ColumnKind.TEXT),
                    new HistoryColumn("title", ColumnKind.TEXT),
                    new HistoryColumn("status", ColumnKind.TEXT),
                    new HistoryColumn("access_source", ColumnKind.TEXT),
                    new HistoryColumn("age", ColumnKind.NUMBER),
                    new HistoryColumn("username", ColumnKind.TEXT),
                    new HistoryColumn("ip", ColumnKind.TEXT),
                    new HistoryColumn("user_agent", ColumnKind.TEXT)),
            History.NOTIFICATION_TABLE, columns(
                    new HistoryColumn("time", ColumnKind.TIME),
                    new HistoryColumn("NOTIFICATION_EVENT_TYPE", ColumnKind.TEXT),
                    new HistoryColumn("MESSAGE_TYPE", ColumnKind.TEXT))
    );

    private final Map<String, HistoryColumn> allowedColumns;
    private final Map<String, Object> parameters = new LinkedHashMap<>();
    private final List<String> wheres = new ArrayList<>();

    private HistoryQueryBuilder(String tableName) {
        allowedColumns = COLUMNS_BY_TABLE.get(tableName);
        if (allowedColumns == null) {
            throw new IllegalArgumentException("Unknown history table " + tableName);
        }
    }

    static HistoryQuery build(HistoryRequest request, String tableName) {
        return new HistoryQueryBuilder(tableName).buildQuery(request);
    }

    private static Map<String, HistoryColumn> columns(HistoryColumn... columns) {
        Map<String, HistoryColumn> map = new LinkedHashMap<>();
        for (HistoryColumn column : columns) {
            map.put(column.sqlName().toLowerCase(Locale.ROOT), column);
        }
        return map;
    }

    private HistoryQuery buildQuery(HistoryRequest request) {
        if (request.getPage() < 1) {
            throw reject("page must be at least 1", null);
        }
        if (request.getLimit() < 1 || request.getLimit() > MAX_LIMIT) {
            throw reject("limit must be between 1 and " + MAX_LIMIT, null);
        }
        if (request.getFilterModel() != null) {
            for (Entry<String, FilterDefinition> entry : request.getFilterModel().entrySet()) {
                addFilter(entry.getKey(), entry.getValue());
            }
        }
        String whereConditions = wheres.isEmpty() ? "" : " WHERE " + String.join(" AND ", wheres);
        long offset = (long) (request.getPage() - 1) * request.getLimit();
        return new HistoryQuery(whereConditions, orderBy(request.getSortModel()), request.getLimit(), offset, parameters);
    }

    private void addFilter(String requestedColumn, FilterDefinition definition) {
        HistoryColumn column = column(requestedColumn, "filter");
        if (definition == null || definition.getFilterType() == null) {
            throw reject("Filter without type", requestedColumn);
        }
        Object filterValue = definition.getFilterValue();
        String sqlName = column.sqlName();
        String filterType = definition.getFilterType().toString();
        if (TEXT_FILTER_TYPES.contains(filterType) && column.kind() != ColumnKind.TEXT) {
            //These compare the column with strings, which H2 would fail to convert for a number or time column
            throw reject("Text filter on a non-text column", requestedColumn);
        }
        switch (filterType) {
            case "freetext" -> {
                requireValue(filterValue, requestedColumn);
                wheres.add("LOWER(" + sqlName + ") LIKE :" + bind("%" + filterValue.toString().toLowerCase() + "%"));
            }
            case "text" -> {
                requireValue(filterValue, requestedColumn);
                wheres.add("LOWER(" + sqlName + ") = :" + bind(filterValue.toString().toLowerCase()));
            }
            case "checkboxes" -> addCheckboxesFilter(sqlName, filterValue, requestedColumn);
            case "boolean" -> {
                if ("all".equals(filterValue)) {
                    return;
                }
                if (!(filterValue instanceof String || filterValue instanceof Boolean || filterValue instanceof Number)) {
                    throw reject("Invalid boolean filter value", requestedColumn);
                }
                //Bound as a string: the column is a text column and H2 would try to convert it to a boolean or number
                wheres.add(sqlName + " = :" + bind(filterValue.toString()));
            }
            case "numberRange" -> {
                if (column.kind() != ColumnKind.NUMBER) {
                    throw reject("Number range filter on a non-numeric column", requestedColumn);
                }
                Map<?, ?> bounds = asMap(filterValue, requestedColumn);
                BigDecimal min = parseNumber(bounds.get("min"), requestedColumn);
                if (min != null) {
                    wheres.add(sqlName + " > :" + bind(min));
                }
                BigDecimal max = parseNumber(bounds.get("max"), requestedColumn);
                if (max != null) {
                    wheres.add(sqlName + " < :" + bind(max));
                }
            }
            case "time" -> {
                if (column.kind() != ColumnKind.TIME) {
                    throw reject("Time filter on a non-time column", requestedColumn);
                }
                Map<?, ?> bounds = asMap(filterValue, requestedColumn);
                LocalDateTime before = parseTime(bounds.get("before"), requestedColumn);
                if (before != null) {
                    wheres.add(sqlName + " <= :" + bind(before));
                }
                LocalDateTime after = parseTime(bounds.get("after"), requestedColumn);
                if (after != null) {
                    wheres.add(sqlName + " >= :" + bind(after));
                }
            }
            default -> throw reject("Unknown filter type", requestedColumn);
        }
    }

    private void addCheckboxesFilter(String sqlName, Object filterValue, String requestedColumn) {
        List<String> values = new ArrayList<>();
        if (filterValue instanceof Collection<?> collection) {
            for (Object value : collection) {
                requireValue(value, requestedColumn);
                values.add(value.toString());
            }
        } else {
            requireValue(filterValue, requestedColumn);
            values.add(filterValue.toString());
        }
        if (values.isEmpty()) {
            //An empty IN list matches nothing
            wheres.add("1 = 0");
            return;
        }
        wheres.add(sqlName + " IN :" + bind(values));
    }

    /**
     * Keeps the previous ordering: text columns case-insensitively with empty values last, {@code time} and {@code age}
     * as they are, and newest first as the tiebreak so paging stays stable. Only the integer {@code 1} means ascending,
     * everything else (including a missing mode) descending, which is how the mode was always read.
     */
    private String orderBy(SortModel sortModel) {
        if (sortModel == null || sortModel.getColumn() == null) {
            return " order by time desc";
        }
        HistoryColumn column = column(sortModel.getColumn(), "sort");
        String direction = Integer.valueOf(1).equals(sortModel.getSortMode()) ? "ASC" : "DESC";
        boolean sortedAsIs = column.kind() != ColumnKind.TEXT;
        String sortExpression = sortedAsIs ? column.sqlName() : "lower(" + column.sqlName() + ")";
        String orderBy = " order by " + sortExpression + " " + direction + (sortedAsIs ? "" : " nulls last");
        if (!TIME_COLUMN.equals(column.sqlName())) {
            orderBy += ", time desc";
        }
        return orderBy;
    }

    private HistoryColumn column(String requestedColumn, String usage) {
        HistoryColumn column = requestedColumn == null ? null : allowedColumns.get(requestedColumn.toLowerCase(Locale.ROOT));
        if (column == null) {
            throw reject("Unknown " + usage + " column", requestedColumn);
        }
        return column;
    }

    private String bind(Object value) {
        String name = "p" + parameters.size();
        parameters.put(name, value);
        return name;
    }

    private static Map<?, ?> asMap(Object filterValue, String requestedColumn) {
        if (filterValue instanceof Map<?, ?> map) {
            return map;
        }
        throw reject("Range filter value must be an object", requestedColumn);
    }

    private static void requireValue(Object value, String requestedColumn) {
        if (value == null) {
            throw reject("Filter without value", requestedColumn);
        }
    }

    private static BigDecimal parseNumber(Object value, String requestedColumn) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        BigDecimal number;
        try {
            number = new BigDecimal(value.toString().trim());
        } catch (NumberFormatException e) {
            throw reject("Number range bound is not a number", requestedColumn);
        }
        if (number.abs().compareTo(MAX_NUMBER_BOUND) > 0 || number.scale() > MAX_NUMBER_SCALE) {
            throw reject("Number range bound is out of range", requestedColumn);
        }
        return number;
    }

    /**
     * The UI sends {@code Date.toISOString()} values like {@code 2026-10-07T12:34:56.789Z}. They used to be handed to
     * {@code PARSEDATETIME} with the {@code T} and the {@code Z} removed, which reads them as a local date-time without
     * any zone conversion. Parsing them as a {@link LocalDateTime} keeps exactly that meaning.
     */
    private static LocalDateTime parseTime(Object value, String requestedColumn) {
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        String text = value.toString().trim();
        if (text.endsWith("Z")) {
            text = text.substring(0, text.length() - 1);
        }
        LocalDateTime time;
        try {
            time = LocalDateTime.parse(text);
        } catch (DateTimeParseException e) {
            throw reject("Time bound is not a valid date-time", requestedColumn);
        }
        if (time.getYear() < MIN_YEAR || time.getYear() > MAX_YEAR) {
            throw reject("Time bound is out of range", requestedColumn);
        }
        return time;
    }

    private static InvalidHistoryRequestException reject(String reason, String requestedColumn) {
        String loggedColumn = requestedColumn == null ? null : StringUtils.abbreviate(requestedColumn.replaceAll("[\\r\\n]", "_"), MAX_LOGGED_COLUMN_LENGTH);
        logger.warn("Rejecting history request: {} (column: {})", reason, loggedColumn);
        return new InvalidHistoryRequestException(reason);
    }
}
