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
 * {@link BaseConfigValidator#prepareForSaving} runs it after every validator that handles its own records - see
 * {@link UserAuthConfigValidator}, whose password is not {@code @HiddenInUI} and is hashed there. List entries are
 * matched to their stored counterparts by {@link StoredRecordMatcher}: by record id, or by name for a record without
 * an id, and never by position.
 */
@Component
public class SensitiveDataConfigValidator {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataConfigValidator.class);
    public static final String UNCHANGED_MARKER = "***UNCHANGED***";

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

            // Match by record id, or by name for records without one - never by position
            final List<Object> oldItems = StoredRecordMatcher.matchList(newList, oldList);
            for (int i = 0; i < newList.size(); i++) {
                Object oldItem = oldItems.get(i);
                if (oldItem != null) {
                    processSensitiveFieldsForSaving(oldItem, newList.get(i));
                } else if (newList.get(i) != null) {
                    logger.debug("Unable to identify the stored counterpart of list entry {}. Any unchanged marker it carries will not be resolved", i);
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

                    // Handle string fields with unchanged marker. This is the fallback pass: every validator that
                    // handles its own records (UserAuthConfig) has already run, so whatever marker is still here is
                    // resolved against the record StoredRecordMatcher could identify - or left alone for the caller
                    // to reject.
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

    private boolean isJavaInternal(Class<?> clazz) {
        final String className = clazz.getName();
        return className.startsWith("java.") || className.startsWith("javax.")
            || className.startsWith("sun.") || className.startsWith("com.sun.");
    }

    private boolean isBackReference(String fieldName) {
        return "parent".equals(fieldName) || "this$0".equals(fieldName);
    }
}
