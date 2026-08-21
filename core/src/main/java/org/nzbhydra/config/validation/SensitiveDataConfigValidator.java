package org.nzbhydra.config.validation;

import org.nzbhydra.config.sensitive.HiddenInUI;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.InaccessibleObjectException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Handles replacing encrypted sensitive data placeholders with actual values when saving,
 * and replacing actual values with placeholders when loading for display.
 * <p>
 * On the way out only {@link HiddenInUI} fields are masked. On the way in this is the *fallback* pass, and
 * {@link BaseConfigValidator#prepareForSaving} runs it after every validator that can identify its own records - see
 * {@link UserAuthConfigValidator}, which matches a user by its username, and whose password is not
 * {@code @HiddenInUI}. Running this pass first would resolve that password by a positional guess before the correct
 * matcher ever saw the marker.
 */
@Component
public class SensitiveDataConfigValidator {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataConfigValidator.class);
    public static final String UNCHANGED_MARKER = "***UNCHANGED***";

    /**
     * Field names that identify a record inside a list, tried in this order. A record recognised by one of these keeps
     * its own stored secrets no matter where it sits in the submitted list.
     */
    private static final List<String> IDENTITY_FIELD_NAMES = List.of("name", "username");

    /**
     * Prepares sensitive fields for display in the frontend by replacing encrypted values with placeholder
     */
    public void prepareForDisplay(Object config) {
        if (config == null) {
            return;
        }
        processSensitiveFields(config, true);
    }

    /**
     * Prepares sensitive fields for saving by replacing unchanged markers with original encrypted values
     */
    public void prepareForSaving(Object oldConfig, Object newConfig) {
        if (oldConfig == null || newConfig == null) {
            return;
        }
        processSensitiveFieldsForSaving(oldConfig, newConfig);
    }

    /**
     * Returns the settings paths of all string fields that still carry the unchanged marker, e.g.
     * {@code auth.users[1].password}. A marker that survives {@code prepareForSaving} could not be resolved to a stored
     * value and must never be written to the config, so the caller rejects the save instead.
     */
    public List<String> findUnresolvedMarkers(Object config) {
        final List<String> paths = new ArrayList<>();
        collectUnresolvedMarkers(config, "", paths, Collections.newSetFromMap(new IdentityHashMap<>()));
        return paths;
    }

    private void collectUnresolvedMarkers(Object obj, String path, List<String> paths, Set<Object> visited) {
        if (obj == null || !visited.add(obj)) {
            return;
        }

        if (obj instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                collectUnresolvedMarkers(list.get(i), path + "[" + i + "]", paths, visited);
            }
            return;
        }

        if (obj instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                collectUnresolvedMarkers(entry.getValue(), childPath(path, String.valueOf(entry.getKey())), paths, visited);
            }
            return;
        }

        Class<?> clazz = obj.getClass();
        if (clazz.isPrimitive() || clazz == String.class || clazz.isEnum() || isJavaInternal(clazz)) {
            return;
        }

        while (clazz != null && clazz != Object.class) {
            for (Field field : clazz.getDeclaredFields()) {
                try {
                    if (field.isSynthetic() || isBackReference(field.getName())) {
                        continue;
                    }
                    try {
                        field.setAccessible(true);
                    } catch (InaccessibleObjectException e) {
                        continue;
                    }
                    final Object fieldValue = field.get(obj);
                    if (fieldValue == null) {
                        continue;
                    }
                    if (field.getType() == String.class) {
                        if (UNCHANGED_MARKER.equals(fieldValue)) {
                            paths.add(childPath(path, field.getName()));
                        }
                        continue;
                    }
                    if (!field.getType().isPrimitive()) {
                        collectUnresolvedMarkers(fieldValue, childPath(path, field.getName()), paths, visited);
                    }
                } catch (Exception e) {
                    // Ignore inaccessible fields
                }
            }
            clazz = clazz.getSuperclass();
        }
    }

    private String childPath(String path, String name) {
        return path.isEmpty() ? name : path + "." + name;
    }

    private void processSensitiveFields(Object obj, boolean forDisplay) {
        if (obj == null) {
            return;
        }

        Class<?> clazz = obj.getClass();

        // Handle lists
        if (obj instanceof List<?> list) {
            for (Object item : list) {
                processSensitiveFields(item, forDisplay);
            }
            return;
        }

        // Handle maps
        if (obj instanceof Map<?, ?> map) {
            for (Object value : map.values()) {
                processSensitiveFields(value, forDisplay);
            }
            return;
        }

        // Skip primitive types and common immutable classes
        if (clazz.isPrimitive() || clazz == String.class || clazz.isEnum()) {
            return;
        }

        // Skip Java internal classes and collections (except lists and maps we handle above)
        if (isJavaInternal(clazz)) {
            return;
        }

        // Process all fields in the class hierarchy
        while (clazz != null && clazz != Object.class) {
            for (Field field : clazz.getDeclaredFields()) {
                try {
                    // Skip synthetic fields and fields we can't access
                    if (field.isSynthetic()) {
                        continue;
                    }

                    // Try to make field accessible, skip if we can't
                    try {
                        field.setAccessible(true);
                    } catch (InaccessibleObjectException e) {
                        // Skip fields we can't access (e.g., in sealed modules)
                        continue;
                    }

                    Object fieldValue = field.get(obj);

                    if (fieldValue == null) {
                        continue;
                    }

                    // For fields marked as hidden in UI, replace with placeholder for display
                    if (field.getType() == String.class && forDisplay && field.isAnnotationPresent(HiddenInUI.class)) {
                        String value = (String) fieldValue;
                        // Don't expose hidden values to frontend, just show placeholder
                        if (value != null && !value.isEmpty()) {
                            field.set(obj, UNCHANGED_MARKER);
                            continue;
                        }
                    }

                    // Recursively process nested objects
                    if (!field.getType().isPrimitive() && field.getType() != String.class) {
                        String fieldName = field.getName();
                        if (!isBackReference(fieldName)) {
                            processSensitiveFields(fieldValue, forDisplay);
                        }
                    }
                } catch (Exception e) {
                    // Ignore inaccessible fields
                }
            }
            clazz = clazz.getSuperclass();
        }
    }

    private void processSensitiveFieldsForSaving(Object oldObj, Object newObj) {
        if (oldObj == null || newObj == null) {
            return;
        }

        Class<?> clazz = newObj.getClass();

        // Handle lists
        if (newObj instanceof List<?> newList && oldObj instanceof List<?> oldList) {

            // Match by identity field if available, by index only while the list length is unchanged
            for (int i = 0; i < newList.size(); i++) {
                Object newItem = newList.get(i);
                Object oldItem = findCorrespondingOldItem(oldList, newItem, i, newList.size());
                if (oldItem != null) {
                    processSensitiveFieldsForSaving(oldItem, newItem);
                }
            }
            return;
        }

        // Skip primitive types and common immutable classes
        if (clazz.isPrimitive() || clazz == String.class || clazz.isEnum()) {
            return;
        }

        // Skip Java internal classes
        if (isJavaInternal(clazz)) {
            return;
        }

        // Process all fields in the class hierarchy
        while (clazz != null && clazz != Object.class) {
            for (Field field : clazz.getDeclaredFields()) {
                try {
                    // Skip synthetic fields and fields we can't access
                    if (field.isSynthetic()) {
                        continue;
                    }

                    // Try to make field accessible, skip if we can't
                    try {
                        field.setAccessible(true);
                    } catch (InaccessibleObjectException e) {
                        // Skip fields we can't access (e.g., in sealed modules)
                        continue;
                    }

                    Object newFieldValue = field.get(newObj);
                    Object oldFieldValue = field.get(oldObj);

                    // Handle string fields with unchanged marker. This is the fallback pass: every validator that can
                    // identify its own records (UserAuthConfig by username) has already run, so whatever marker is
                    // still here is resolved against the record findCorrespondingOldItem could identify - or left
                    // alone for the caller to reject.
                    if (field.getType() == String.class) {
                        if (UNCHANGED_MARKER.equals(newFieldValue) && oldFieldValue != null) {
                            // Replace unchanged marker with the original encrypted value
                            field.set(newObj, oldFieldValue);
                        }
                        continue;
                    }

                    // Recursively process nested objects
                    if (newFieldValue != null && oldFieldValue != null && !field.getType().isPrimitive()) {
                        String fieldName = field.getName();
                        if (!isBackReference(fieldName)) {
                            processSensitiveFieldsForSaving(oldFieldValue, newFieldValue);
                        }
                    }
                } catch (Exception e) {
                    // Ignore inaccessible fields
                }
            }
            clazz = clazz.getSuperclass();
        }
    }

    /**
     * Finds the stored counterpart of a submitted list entry.
     * <p>
     * An entry that carries an identity field ({@code name} or {@code username}) is matched by it, wherever it sits in
     * either list. Without such a match the index is only a safe guess while the list has not changed length - a
     * same-length list means an entry was edited or renamed, while an added or removed entry shifts every following
     * record, and following the shift would move one record's credentials onto another one. In that case no counterpart
     * is returned and the marker stays in place, which the caller then rejects rather than guessing.
     *
     * @return the corresponding old item or null if none could be identified
     */
    private Object findCorrespondingOldItem(List<?> oldList, Object newItem, int index, int newListSize) {
        if (newItem == null) {
            return null;
        }

        final Field identityField = findIdentityField(newItem.getClass());
        if (identityField != null) {
            final Object newIdentity = readField(identityField, newItem);
            if (newIdentity != null) {
                for (Object oldItem : oldList) {
                    if (oldItem != null && oldItem.getClass() == newItem.getClass() && newIdentity.equals(readField(identityField, oldItem))) {
                        return oldItem;
                    }
                }
            }
        }

        if (newListSize != oldList.size()) {
            logger.debug("Unable to identify the stored counterpart of list entry {} after the list length changed from {} to {}. Any unchanged marker it carries will not be resolved", index, oldList.size(), newListSize);
            return null;
        }

        return index < oldList.size() ? oldList.get(index) : null;
    }

    private Field findIdentityField(Class<?> clazz) {
        for (String candidate : IDENTITY_FIELD_NAMES) {
            Class<?> current = clazz;
            while (current != null && current != Object.class) {
                try {
                    final Field field = current.getDeclaredField(candidate);
                    if (field.getType() == String.class) {
                        field.setAccessible(true);
                        return field;
                    }
                } catch (NoSuchFieldException | InaccessibleObjectException | SecurityException e) {
                    // Try the next candidate or superclass
                }
                current = current.getSuperclass();
            }
        }
        return null;
    }

    private Object readField(Field field, Object target) {
        try {
            return field.get(target);
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isJavaInternal(Class<?> clazz) {
        final String className = clazz.getName();
        return className.startsWith("java.") || className.startsWith("javax.")
            || className.startsWith("sun.") || className.startsWith("com.sun.");
    }

    private boolean isBackReference(String fieldName) {
        return "parent".equals(fieldName) || "this$0".equals(fieldName);
    }
}
