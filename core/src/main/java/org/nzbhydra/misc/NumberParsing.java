package org.nzbhydra.misc;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Lenient parsing of numbers provided by external sources (mostly indexer supplied attributes).
 * Indexers regularly send values like an empty string or "N/A" where a number is expected. Such values must not
 * abort the processing of a whole response, so these methods return null instead of throwing.
 */
public class NumberParsing {

    private static final Logger logger = LoggerFactory.getLogger(NumberParsing.class);

    private NumberParsing() {
    }

    /**
     * @return the parsed value or null if the value is null, empty or not a number.
     */
    public static Integer parseIntOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.valueOf(value.trim());
        } catch (NumberFormatException e) {
            logger.debug("Unable to parse '{}' as integer", value);
            return null;
        }
    }

    /**
     * @return the parsed value or null if the value is null, empty or not a number.
     */
    public static Long parseLongOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.valueOf(value.trim());
        } catch (NumberFormatException e) {
            logger.debug("Unable to parse '{}' as long", value);
            return null;
        }
    }

    /**
     * @return the parsed value or null if the value is null, empty or not a number.
     */
    public static Float parseFloatOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Float.valueOf(value.trim());
        } catch (NumberFormatException e) {
            logger.debug("Unable to parse '{}' as float", value);
            return null;
        }
    }
}
