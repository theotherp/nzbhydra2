package org.nzbhydra.config.validation;

import com.google.common.base.Joiner;
import com.google.common.base.Strings;
import org.nzbhydra.config.sensitive.HiddenInUI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.lang.reflect.Field;
import java.lang.reflect.InaccessibleObjectException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Finds the stored counterpart of a record the UI (or an API client) submitted, so that a secret it sent as
 * {@value SensitiveDataConfigValidator#UNCHANGED_MARKER} can be replaced by the value stored for the same record.
 * <p>
 * The identity rule, shared by saving the config and by the checks that run before saving (connection and caps
 * checks):
 * <ul>
 *     <li>A record with an {@code id} is matched only by that id. An id no stored record has, or one used by more than
 *     one submitted record, matches nothing.</li>
 *     <li>A record without an id (a record the UI just added, or one sent by an API client) is matched by its
 *     {@code name} / {@code username}, but only to a stored record whose id no submitted record claims, and only if
 *     exactly one stored and one submitted record carry that name.</li>
 *     <li>Records are never matched by their position in a list. After a record was added or removed the positions
 *     no longer say anything about which record is which.</li>
 * </ul>
 * A record without a counterpart keeps its markers, which the callers then reject instead of guessing.
 */
public final class StoredRecordMatcher {

    private static final Logger logger = LoggerFactory.getLogger(StoredRecordMatcher.class);

    private static final String ID_FIELD_NAME = "id";
    /**
     * Field names that identify a record without an id, tried in this order.
     */
    private static final List<String> NAME_FIELD_NAMES = List.of("name", "username");

    private static final Map<String, String> FIELD_LABELS = Map.of(
        "apiKey", "API key",
        "username", "username",
        "password", "password"
    );
    /**
     * The order in which unresolved fields are named in a message, regardless of their declaration order.
     */
    private static final List<String> FIELD_ORDER = List.of("apiKey", "username", "password");

    private StoredRecordMatcher() {
    }

    /**
     * Matches each entry of a submitted list to its stored counterpart.
     *
     * @return a list of the same size as {@code submitted} holding the stored counterpart of the entry at the same
     * index, or null where none could be identified
     */
    public static List<Object> matchList(List<?> submitted, Collection<?> stored) {
        final List<Object> result = new ArrayList<>(Collections.nCopies(submitted.size(), null));
        if (stored == null || stored.isEmpty()) {
            return result;
        }
        final Set<Object> claimed = Collections.newSetFromMap(new IdentityHashMap<>());

        final Map<String, Integer> submittedIdCounts = new HashMap<>();
        for (Object item : submitted) {
            final String id = readIdentity(item, ID_FIELD_NAME);
            if (id != null) {
                submittedIdCounts.merge(id, 1, Integer::sum);
            }
        }

        for (int i = 0; i < submitted.size(); i++) {
            final Object item = submitted.get(i);
            final String id = readIdentity(item, ID_FIELD_NAME);
            if (id == null) {
                continue;
            }
            if (submittedIdCounts.get(id) > 1) {
                logger.warn("The record id {} was submitted for more than one record. Any unchanged marker these records carry will not be resolved", id);
                continue;
            }
            for (Object candidate : stored) {
                if (isSameType(item, candidate) && !claimed.contains(candidate) && id.equals(readIdentity(candidate, ID_FIELD_NAME))) {
                    result.set(i, candidate);
                    claimed.add(candidate);
                    break;
                }
            }
            if (result.get(i) == null) {
                logger.debug("No stored record with id {} found. Any unchanged marker it carries will not be resolved", id);
            }
        }

        final Map<String, Integer> nameCountsWithoutId = new HashMap<>();
        for (Object item : submitted) {
            if (item != null && readIdentity(item, ID_FIELD_NAME) == null) {
                final String name = readName(item);
                if (name != null) {
                    nameCountsWithoutId.merge(name, 1, Integer::sum);
                }
            }
        }

        for (int i = 0; i < submitted.size(); i++) {
            final Object item = submitted.get(i);
            if (item == null || readIdentity(item, ID_FIELD_NAME) != null) {
                continue;
            }
            final String name = readName(item);
            if (name == null || nameCountsWithoutId.get(name) > 1) {
                continue;
            }
            final List<Object> candidates = new ArrayList<>();
            for (Object candidate : stored) {
                if (!isSameType(item, candidate) || claimed.contains(candidate) || !name.equals(readName(candidate))) {
                    continue;
                }
                final String candidateId = readIdentity(candidate, ID_FIELD_NAME);
                if (candidateId != null && submittedIdCounts.containsKey(candidateId)) {
                    // Another submitted record says it is this one
                    continue;
                }
                candidates.add(candidate);
            }
            if (candidates.size() == 1) {
                result.set(i, candidates.get(0));
                claimed.add(candidates.get(0));
            }
        }
        return result;
    }

    /**
     * Finds the stored counterpart of a single submitted record, e.g. one sent for a connection check.
     *
     * @return the stored record or null if none could be identified
     */
    public static <T> T findStoredCounterpart(T submitted, Collection<? extends T> stored) {
        if (submitted == null) {
            return null;
        }
        //noinspection unchecked
        return (T) matchList(Collections.singletonList(submitted), stored).get(0);
    }

    /**
     * Replaces every {@link HiddenInUI} string field of {@code submitted} that carries the unchanged marker with the
     * value of its stored counterpart. Used by the checks that contact a remote service with a record that has not
     * been saved yet.
     *
     * @return which fields were resolved and which still carry the marker. The remote service must not be contacted
     * while any field is unresolved.
     */
    public static <T> Resolution resolveUnchangedMarkers(T submitted, Collection<? extends T> stored) {
        final List<Field> markedFields = new ArrayList<>();
        for (Field field : hiddenStringFields(submitted.getClass())) {
            if (SensitiveDataConfigValidator.UNCHANGED_MARKER.equals(readField(field, submitted))) {
                markedFields.add(field);
            }
        }
        if (markedFields.isEmpty()) {
            return new Resolution(List.of(), List.of());
        }
        final T counterpart = findStoredCounterpart(submitted, stored);
        final List<Field> resolved = new ArrayList<>();
        final List<String> unresolved = new ArrayList<>();
        for (Field field : markedFields) {
            final Object storedValue = counterpart == null ? null : readField(field, counterpart);
            if (storedValue instanceof String storedString && !storedString.isEmpty() && !SensitiveDataConfigValidator.UNCHANGED_MARKER.equals(storedString)) {
                writeField(field, submitted, storedString);
                resolved.add(field);
            } else {
                unresolved.add(field.getName());
            }
        }
        return new Resolution(resolved, unresolved);
    }

    /**
     * The outcome of {@link #resolveUnchangedMarkers}.
     */
    public static final class Resolution {
        private final List<Field> resolvedFields;
        private final List<String> unresolvedFields;

        private Resolution(List<Field> resolvedFields, List<String> unresolvedFields) {
            this.resolvedFields = resolvedFields;
            this.unresolvedFields = unresolvedFields;
        }

        public boolean isComplete() {
            return unresolvedFields.isEmpty();
        }

        public List<String> getUnresolvedFields() {
            return unresolvedFields;
        }

        /**
         * A message for the user naming the values that could not be found, e.g. "No saved API key found for indexer
         * Foo. Please enter the API key again."
         */
        public String getMessage(String recordType, String recordName) {
            final List<String> labels = unresolvedFields.stream()
                .sorted(Comparator.comparingInt(x -> FIELD_ORDER.contains(x) ? FIELD_ORDER.indexOf(x) : FIELD_ORDER.size()))
                .map(x -> FIELD_LABELS.getOrDefault(x, x))
                .toList();
            final String joined = labels.size() == 1 ? labels.get(0) : Joiner.on(", ").join(labels.subList(0, labels.size() - 1)) + " and " + labels.get(labels.size() - 1);
            return "No saved " + joined + " found for " + recordType + " " + recordName + ". Please enter the " + joined + " again.";
        }

        /**
         * Puts the unchanged marker back into the fields that were resolved, so a record returned to the UI does not
         * carry the stored secrets.
         */
        public void restoreMarkers(Object target) {
            for (Field field : resolvedFields) {
                writeField(field, target, SensitiveDataConfigValidator.UNCHANGED_MARKER);
            }
        }
    }

    private static boolean isSameType(Object a, Object b) {
        return a != null && b != null && a.getClass() == b.getClass();
    }

    private static String readName(Object item) {
        for (String candidate : NAME_FIELD_NAMES) {
            if (findStringField(item.getClass(), candidate) != null) {
                return readIdentity(item, candidate);
            }
        }
        return null;
    }

    /**
     * @return the non-empty value of the named string field or null
     */
    private static String readIdentity(Object item, String fieldName) {
        if (item == null) {
            return null;
        }
        final Field field = findStringField(item.getClass(), fieldName);
        if (field == null) {
            return null;
        }
        return Strings.emptyToNull((String) readField(field, item));
    }

    private static Field findStringField(Class<?> clazz, String name) {
        Class<?> current = clazz;
        while (current != null && current != Object.class) {
            try {
                final Field field = current.getDeclaredField(name);
                if (field.getType() == String.class) {
                    field.setAccessible(true);
                    return field;
                }
                return null;
            } catch (NoSuchFieldException e) {
                current = current.getSuperclass();
            } catch (InaccessibleObjectException | SecurityException e) {
                return null;
            }
        }
        return null;
    }

    private static List<Field> hiddenStringFields(Class<?> clazz) {
        final List<Field> fields = new ArrayList<>();
        Class<?> current = clazz;
        while (current != null && current != Object.class) {
            for (Field field : current.getDeclaredFields()) {
                if (field.getType() == String.class && field.isAnnotationPresent(HiddenInUI.class)) {
                    try {
                        field.setAccessible(true);
                        fields.add(field);
                    } catch (InaccessibleObjectException | SecurityException e) {
                        // Not a config field we can handle
                    }
                }
            }
            current = current.getSuperclass();
        }
        return fields;
    }

    private static Object readField(Field field, Object target) {
        try {
            return field.get(target);
        } catch (IllegalAccessException e) {
            return null;
        }
    }

    private static void writeField(Field field, Object target, String value) {
        try {
            field.set(target, value);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException("Unable to write field " + field.getName(), e);
        }
    }
}
