package org.nzbhydra.searching;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Some indexers put several languages into one newznab "language" attribute ("English - Japanese", NZBGeek; also seen
 * with "," "/" and "|"). Newznab expects one attribute per language and Sonarr/Radarr only read the value as a single
 * language (#888), so Hydra splits the value and emits one attribute per language.
 */
public final class LanguageAttribute {

    public static final String NAME = "language";

    /**
     * A dash only splits when it is surrounded by whitespace so that hyphenated names ("Chinese-Mandarin") survive.
     */
    private static final Pattern SEPARATORS = Pattern.compile("\\s*(?:\\s-\\s|,|/|\\|)\\s*");

    private LanguageAttribute() {
    }

    public static boolean isLanguage(String attributeName) {
        return NAME.equalsIgnoreCase(attributeName);
    }

    /**
     * The individual languages in an attribute value, trimmed, empty parts dropped. A value without separators is
     * returned as its single trimmed entry; null or blank yields an empty list.
     */
    public static List<String> split(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(SEPARATORS.split(value.trim()))
            .map(String::trim)
            .filter(x -> !x.isEmpty() && !x.equals("-"))
            .toList();
    }
}
