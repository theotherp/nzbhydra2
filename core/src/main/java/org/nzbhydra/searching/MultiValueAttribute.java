package org.nzbhydra.searching;

import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Some indexers put several values into one newznab attribute ("English - Japanese", NZBGeek; also seen with ","
 * "/" and "|"), and some send the same attribute name several times, once per value (#888, #911 for "subs"). Either
 * way Hydra collects every individual value and emits one attribute per value, deduplicated.
 */
public final class MultiValueAttribute {

    public static final MultiValueAttribute LANGUAGE = new MultiValueAttribute("language");
    public static final MultiValueAttribute SUBS = new MultiValueAttribute("subs");

    /**
     * A dash only splits when it is surrounded by whitespace so that hyphenated names ("Chinese-Mandarin") survive.
     */
    private static final Pattern SEPARATORS = Pattern.compile("\\s*(?:\\s-\\s|,|/|\\|)\\s*");

    private final String name;

    private MultiValueAttribute(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public boolean matches(String attributeName) {
        return name.equalsIgnoreCase(attributeName);
    }

    public static boolean isMultiValue(String attributeName) {
        return LANGUAGE.matches(attributeName) || SUBS.matches(attributeName);
    }

    /**
     * The individual values in an attribute value, trimmed, empty parts dropped. A value without separators is
     * returned as its single trimmed entry; null or blank yields an empty list.
     */
    public List<String> split(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(SEPARATORS.split(value.trim()))
            .map(String::trim)
            .filter(x -> !x.isEmpty() && !x.equals("-"))
            .toList();
    }
}
