package org.nzbhydra.externalapi;

import org.nzbhydra.historystats.FilterDefinition;
import org.nzbhydra.historystats.FilterModel;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Translates the query parameters of the three history routes into the internal
 * {@link HistoryRequest}/{@link FilterModel}/{@link SortModel} triple.
 *
 * <p>The column names are the ones {@code History.getHistory} already understands - they are the database column
 * names it interpolates into the generated SQL, which is why they appear here and nowhere in the contract classes.
 * The filter types are equally its own vocabulary: {@code freetext} is a case-insensitive {@code LIKE %...%},
 * {@code checkboxes} an {@code IN} list (used with a single value for the exact matches), and {@code time} a pair of
 * bounds that it parses with {@code PARSEDATETIME}, hence the fixed millisecond format below.
 */
@Component
public class ExternalHistoryRequestMapper {

    public static final int DEFAULT_PAGE = 1;
    public static final int DEFAULT_LIMIT = 100;
    public static final int MAX_LIMIT = 500;
    public static final String DEFAULT_ORDER = "desc";

    static final String COLUMN_TIME = "time";
    static final String COLUMN_QUERY = "query";
    static final String COLUMN_TITLE = "title";
    static final String COLUMN_INDEXER_NAME = "name";
    static final String COLUMN_STATUS = "status";
    static final String COLUMN_USERNAME = "username";
    static final String COLUMN_IP = "ip";
    static final String COLUMN_USER_AGENT = "user_agent";
    static final String COLUMN_EVENT_TYPE = "NOTIFICATION_EVENT_TYPE";
    static final String COLUMN_MESSAGE_TYPE = "MESSAGE_TYPE";

    static final String FILTER_FREETEXT = "freetext";
    static final String FILTER_CHECKBOXES = "checkboxes";
    static final String FILTER_TIME = "time";

    /**
     * What {@code History.getHistory} feeds to H2's {@code PARSEDATETIME} after removing the {@code T} and the
     * {@code Z}, so a bound has to carry exactly three fractional digits.
     */
    private static final DateTimeFormatter TIME_BOUND_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    /**
     * The parameters all three history routes share, already validated.
     *
     * @param page      the 1 based page number
     * @param limit     how many entries a page holds, at most {@value #MAX_LIMIT}
     * @param from      lower bound on the entry time, or {@code null}
     * @param to        upper bound on the entry time, or {@code null}
     * @param ascending whether the oldest entry comes first
     */
    public record CommonParams(int page, int limit, Instant from, Instant to, boolean ascending) {

    }

    /**
     * Validates the shared query parameters. Everything it rejects is an {@link IllegalArgumentException}, which the
     * {@link ExternalApiExceptionHandler} turns into a 400 with an {@code INVALID_PARAMETER} body.
     */
    public CommonParams commonParams(Integer page, Integer limit, String from, String to, String order) {
        int resolvedPage = page == null ? DEFAULT_PAGE : page;
        if (resolvedPage < 1) {
            throw new IllegalArgumentException("page must be at least 1 but was " + resolvedPage);
        }
        int resolvedLimit = limit == null ? DEFAULT_LIMIT : limit;
        if (resolvedLimit < 1 || resolvedLimit > MAX_LIMIT) {
            throw new IllegalArgumentException("limit must be between 1 and " + MAX_LIMIT + " but was " + resolvedLimit);
        }
        Instant resolvedFrom = parseInstant(from, "from");
        Instant resolvedTo = parseInstant(to, "to");
        return new CommonParams(resolvedPage, resolvedLimit, resolvedFrom, resolvedTo, parseAscending(order));
    }

    public HistoryRequest forSearches(CommonParams common, String query, String username, String ip, String userAgent) {
        FilterModel filterModel = baseFilterModel(common);
        addFreetext(filterModel, COLUMN_QUERY, query);
        addFreetext(filterModel, COLUMN_USERNAME, username);
        addFreetext(filterModel, COLUMN_IP, ip);
        addFreetext(filterModel, COLUMN_USER_AGENT, userAgent);
        return historyRequest(common, filterModel);
    }

    public HistoryRequest forDownloads(CommonParams common, String title, String indexer, String status,
                                       String username, String ip, String userAgent) {
        FilterModel filterModel = baseFilterModel(common);
        addFreetext(filterModel, COLUMN_TITLE, title);
        addExact(filterModel, COLUMN_INDEXER_NAME, indexer);
        addExact(filterModel, COLUMN_STATUS, status);
        addFreetext(filterModel, COLUMN_USERNAME, username);
        addFreetext(filterModel, COLUMN_IP, ip);
        addFreetext(filterModel, COLUMN_USER_AGENT, userAgent);
        return historyRequest(common, filterModel);
    }

    public HistoryRequest forNotifications(CommonParams common, String eventType, String messageType) {
        FilterModel filterModel = baseFilterModel(common);
        addExact(filterModel, COLUMN_EVENT_TYPE, eventType);
        addExact(filterModel, COLUMN_MESSAGE_TYPE, messageType);
        return historyRequest(common, filterModel);
    }

    private HistoryRequest historyRequest(CommonParams common, FilterModel filterModel) {
        HistoryRequest request = new HistoryRequest();
        request.setPage(common.page());
        request.setLimit(common.limit());
        request.setFilterModel(filterModel);
        request.setSortModel(new SortModel(COLUMN_TIME, common.ascending() ? 1 : 2));
        return request;
    }

    private FilterModel baseFilterModel(CommonParams common) {
        FilterModel filterModel = new FilterModel();
        if (common.from() == null && common.to() == null) {
            return filterModel;
        }
        Map<String, String> bounds = new HashMap<>();
        if (common.from() != null) {
            bounds.put("after", TIME_BOUND_FORMAT.format(common.from()));
        }
        if (common.to() != null) {
            bounds.put("before", TIME_BOUND_FORMAT.format(common.to()));
        }
        filterModel.put(COLUMN_TIME, new FilterDefinition(bounds, FILTER_TIME, null));
        return filterModel;
    }

    private void addFreetext(FilterModel filterModel, String column, String value) {
        if (StringUtils.hasText(value)) {
            filterModel.put(column, new FilterDefinition(value, FILTER_FREETEXT, null));
        }
    }

    /**
     * An exact match, expressed as a one element {@code IN} list. {@code History}'s own {@code text} filter type
     * lower-cases both sides, which would never match an upper case enum name stored in the database.
     */
    private void addExact(FilterModel filterModel, String column, String value) {
        if (StringUtils.hasText(value)) {
            filterModel.put(column, new FilterDefinition(List.of(value), FILTER_CHECKBOXES, null));
        }
    }

    private boolean parseAscending(String order) {
        String resolved = order == null ? DEFAULT_ORDER : order.trim();
        if ("asc".equalsIgnoreCase(resolved)) {
            return true;
        }
        if ("desc".equalsIgnoreCase(resolved)) {
            return false;
        }
        throw new IllegalArgumentException("order must be either asc or desc but was " + order);
    }

    /**
     * Parses an ISO-8601 instant, with or without an explicit offset. Also used by the stats route, which takes its
     * bounds the same way.
     */
    public Instant parseInstant(String value, String parameterName) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Instant.parse(value.trim());
        } catch (DateTimeParseException e) {
            try {
                return OffsetDateTime.parse(value.trim()).toInstant();
            } catch (DateTimeParseException e2) {
                throw new IllegalArgumentException(parameterName + " is not a valid ISO-8601 instant: " + value);
            }
        }
    }
}
