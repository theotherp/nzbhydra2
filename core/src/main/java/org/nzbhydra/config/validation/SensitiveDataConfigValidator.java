package org.nzbhydra.config.validation;

import org.nzbhydra.config.sensitive.SensitiveDataObfuscator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.InaccessibleObjectException;
import java.util.List;
import java.util.Map;

/**
 * Handles replacing encrypted sensitive data placeholders with actual values when saving,
 * and replacing actual values with placeholders when loading for display.
 */
@Component
public class SensitiveDataConfigValidator {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataConfigValidator.class);
    private static final String UNCHANGED_MARKER = "***UNCHANGED***";

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
        String className = clazz.getName();
        if (className.startsWith("java.") || className.startsWith("javax.") ||
            className.startsWith("sun.") || className.startsWith("com.sun.")) {
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

                    // For encrypted sensitive string fields, replace with placeholder for display
                    if (field.getType() == String.class && forDisplay) {
                        String value = (String) fieldValue;
                        if (SensitiveDataObfuscator.isEncrypted(value)) {
                            // Don't expose the encrypted value to frontend, just show placeholder
                            field.set(obj, UNCHANGED_MARKER);
                            continue;
                        }
                    }

                    // Recursively process nested objects
                    if (!field.getType().isPrimitive() && field.getType() != String.class) {
                        String fieldName = field.getName();
                        if (!fieldName.equals("parent") && !fieldName.equals("this$0")) {
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

            // Match by index or by name field if available
            for (int i = 0; i < newList.size(); i++) {
                Object newItem = newList.get(i);
                Object oldItem = findCorrespondingOldItem(oldList, newItem, i);
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
        String className = clazz.getName();
        if (className.startsWith("java.") || className.startsWith("javax.") ||
            className.startsWith("sun.") || className.startsWith("com.sun.")) {
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

                    // Handle string fields with unchanged marker
                    if (field.getType() == String.class && newFieldValue != null) {
                        String newValue = (String) newFieldValue;
                        if (UNCHANGED_MARKER.equals(newValue) && oldFieldValue != null) {
                            // Replace unchanged marker with the original encrypted value
                            field.set(newObj, oldFieldValue);
                            continue;
                        }
                    }

                    // Recursively process nested objects
                    if (newFieldValue != null && oldFieldValue != null &&
                        !field.getType().isPrimitive() && field.getType() != String.class) {
                        String fieldName = field.getName();
                        if (!fieldName.equals("parent") && !fieldName.equals("this$0")) {
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

    private Object findCorrespondingOldItem(List<?> oldList, Object newItem, int index) {
        // First try by index
        if (index < oldList.size()) {
            Object oldItem = oldList.get(index);

            // Try to match by name field if it exists
            try {
                Field nameField = newItem.getClass().getDeclaredField("name");
                try {
                    nameField.setAccessible(true);
                } catch (InaccessibleObjectException e) {
                    // Can't access field, fall back to index match
                    return oldItem;
                }
                Object newName = nameField.get(newItem);

                if (newName != null) {
                    for (Object old : oldList) {
                        Object oldName = nameField.get(old);
                        if (newName.equals(oldName)) {
                            return old;
                        }
                    }
                }
            } catch (NoSuchFieldException e) {
                // No name field, use index match
            } catch (Exception e) {
                // Ignore other exceptions
            }

            return oldItem;
        }
        return null;
    }
}