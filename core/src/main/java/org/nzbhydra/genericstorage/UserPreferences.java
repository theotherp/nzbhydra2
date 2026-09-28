package org.nzbhydra.genericstorage;

import org.nzbhydra.Jackson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * The web UI's display options and other preferences, stored per user in the generic storage so they follow the user
 * to every browser and machine. The record is one JSON object whose top-level properties ("sections") are written
 * independently, so two pages (or two tabs) writing different sections don't overwrite each other.
 * <p>
 * Without authentication (or for an anonymous session) every browser shares one record.
 */
@Component
public class UserPreferences {

    /**
     * {@link GenericStorageWeb} refuses keys with this prefix: the record is only reachable through
     * {@link UserPreferencesWeb}, which derives the key from the session instead of accepting one.
     */
    static final String KEY_PREFIX = "userPreferences";
    static final int MAX_SIZE = 32 * 1024;
    private static final Pattern SECTION_PATTERN = Pattern.compile("[A-Za-z0-9_.-]{1,64}");

    @Autowired
    private GenericStorage genericStorage;

    static boolean isReservedKey(String key) {
        return key.startsWith(KEY_PREFIX);
    }

    static boolean isValidSection(String section) {
        return section != null && SECTION_PATTERN.matcher(section).matches();
    }

    /**
     * All sections stored for the user, as plain maps, lists and values so any serializer can write them.
     */
    public Map<String, Object> get(String username) {
        return Jackson.JSON_MAPPER.convertValue(read(username), new TypeReference<Map<String, Object>>() {
        });
    }

    /**
     * Replaces one section. A null value removes it.
     *
     * @throws IllegalArgumentException if the section name is invalid
     * @throws RecordTooLargeException  if the record would exceed {@link #MAX_SIZE} characters
     */
    public synchronized void put(String username, String section, JsonNode value) {
        if (!isValidSection(section)) {
            throw new IllegalArgumentException("Invalid section name");
        }
        final ObjectNode preferences = read(username);
        if (value == null || value.isNull() || value.isMissingNode()) {
            preferences.remove(section);
        } else {
            preferences.set(section, value);
        }
        final String json = Jackson.JSON_MAPPER.writeValueAsString(preferences);
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_SIZE) {
            throw new RecordTooLargeException();
        }
        genericStorage.saveJson(keyFor(username), preferences.isEmpty() ? null : json);
    }

    private ObjectNode read(String username) {
        final String json = genericStorage.getJson(keyFor(username)).orElse(null);
        if (json != null) {
            try {
                if (Jackson.JSON_MAPPER.readTree(json) instanceof ObjectNode objectNode) {
                    return objectNode;
                }
            } catch (JacksonException ignored) {
                // A record that doesn't parse (e.g. edited by hand) is dropped with the next write
            }
        }
        return Jackson.JSON_MAPPER.createObjectNode();
    }

    static String keyFor(String username) {
        return username == null ? KEY_PREFIX : KEY_PREFIX + "-" + username;
    }

    public static class RecordTooLargeException extends RuntimeException {
        public RecordTooLargeException() {
            super("The preferences may not exceed " + MAX_SIZE + " bytes");
        }
    }
}
