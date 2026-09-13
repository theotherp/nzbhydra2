package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.NewznabParameters;

import java.util.HashMap;
import java.util.Map;

/**
 * The behaviour of the "indexer" that a request is addressed to, derived from its API key.
 */
public record IndexerPersona(String titleBase, int resultCount, boolean reportsApiLimits) {

    public static final int API_MAX = 300;

    private static final Map<Integer, Integer> APIKEY_TO_RESULT_COUNT = new HashMap<>();

    static {
        APIKEY_TO_RESULT_COUNT.put(0, 10);
        APIKEY_TO_RESULT_COUNT.put(1, 20);
        APIKEY_TO_RESULT_COUNT.put(2, 400);
        APIKEY_TO_RESULT_COUNT.put(3, 300);
        APIKEY_TO_RESULT_COUNT.put(4, 200);
        APIKEY_TO_RESULT_COUNT.put(5, API_MAX);
        APIKEY_TO_RESULT_COUNT.put(10, 10);
        APIKEY_TO_RESULT_COUNT.put(API_MAX, 30);
    }

    public static IndexerPersona of(NewznabParameters parameters) {
        String titleBase = parameters.getApikey();
        if (parameters.getQ() != null && parameters.getQ().contains("groups")) {
            titleBase = "";
        }
        return new IndexerPersona(titleBase, resultCount(titleBase), parameters.getApikey() != null && parameters.getApikey().contains("limits"));
    }

    /**
     * Mirrors the original lookup: anything that is not a number falls back to the key {@code 0} (and therefore to ten
     * results), a number without an entry in the table means no results at all.
     */
    private static int resultCount(String titleBase) {
        int key = 0;
        try {
            key = Integer.parseInt(titleBase);
        } catch (NumberFormatException e) {
            //Keep 0
        }
        Integer count = APIKEY_TO_RESULT_COUNT.get(key);
        return count == null ? 0 : count;
    }

}
