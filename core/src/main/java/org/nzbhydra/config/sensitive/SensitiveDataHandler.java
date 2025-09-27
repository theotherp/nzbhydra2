package org.nzbhydra.config.sensitive;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.InaccessibleObjectException;
import java.util.ArrayList;
import java.util.List;

@Component
public class SensitiveDataHandler {

    private static final Logger logger = LoggerFactory.getLogger(SensitiveDataHandler.class);

    /**
     * Encrypts all fields marked with @SensitiveData in the given object and its nested objects
     */
    public void encryptSensitiveData(Object obj) {
        if (obj == null) {
            return;
        }

        processObject(obj, true);
    }

    /**
     * Decrypts all fields marked with @SensitiveData in the given object and its nested objects
     */
    public void decryptSensitiveData(Object obj) {
        if (obj == null) {
            return;
        }

        processObject(obj, false);
    }

    private void processObject(Object obj, boolean encrypt) {
        if (obj == null) {
            return;
        }

        Class<?> clazz = obj.getClass();

        // Skip primitive types and common immutable classes
        if (clazz.isPrimitive() || clazz == String.class || clazz == Integer.class ||
            clazz == Long.class || clazz == Boolean.class || clazz == Double.class ||
            clazz == Float.class || clazz.isEnum()) {
            return;
        }

        // Skip Java internal classes and collections (except lists)
        String className = clazz.getName();
        if (className.startsWith("java.") || className.startsWith("javax.") ||
            className.startsWith("sun.") || className.startsWith("com.sun.")) {
            // Process lists specially
            if (obj instanceof List<?> list) {
                for (Object item : list) {
                    processObject(item, encrypt);
                }
            }
            // Skip other Java internal types like Map, Set, etc.
            return;
        }

        // Process lists
        if (obj instanceof List<?> list) {
            for (Object item : list) {
                processObject(item, encrypt);
            }
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

                    // Process fields with @SensitiveData annotation
                    if (field.isAnnotationPresent(SensitiveData.class)) {
                        if (field.getType() == String.class) {
                            String value = (String) field.get(obj);
                            if (value != null) {
                                String processedValue = encrypt
                                        ? SensitiveDataObfuscator.encrypt(value)
                                        : SensitiveDataObfuscator.decrypt(value);
                                field.set(obj, processedValue);
                            }
                        }
                    }

                    // Recursively process nested objects
                    Object fieldValue = field.get(obj);
                    if (fieldValue != null && !field.getType().isPrimitive() && !field.getType().equals(String.class)) {
                        // Skip fields that might cause circular references
                        String fieldName = field.getName();
                        if (!fieldName.equals("parent") && !fieldName.equals("this$0")) {
                            processObject(fieldValue, encrypt);
                        }
                    }
                } catch (Exception e) {
                    logger.debug("Failed to process field {} in class {}", field.getName(), clazz.getName(), e);
                }
            }
            clazz = clazz.getSuperclass();
        }
    }

    /**
     * Returns a list of all fields with sensitive data in the given object
     */
    public List<String> listSensitiveFields(Object obj) {
        List<String> sensitiveFields = new ArrayList<>();
        if (obj == null) {
            return sensitiveFields;
        }

        findSensitiveFields(obj, "", sensitiveFields);
        return sensitiveFields;
    }

    private void findSensitiveFields(Object obj, String path, List<String> sensitiveFields) {
        if (obj == null) {
            return;
        }

        Class<?> clazz = obj.getClass();

        // Skip primitive types and common immutable classes
        if (clazz.isPrimitive() || clazz == String.class || clazz == Integer.class ||
            clazz == Long.class || clazz == Boolean.class || clazz == Double.class ||
            clazz == Float.class || clazz.isEnum()) {
            return;
        }

        // Skip Java internal classes and collections (except lists)
        String className = clazz.getName();
        if (className.startsWith("java.") || className.startsWith("javax.") ||
            className.startsWith("sun.") || className.startsWith("com.sun.")) {
            // Process lists specially
            if (obj instanceof List<?> list) {
                for (int i = 0; i < list.size(); i++) {
                    findSensitiveFields(list.get(i), path + "[" + i + "]", sensitiveFields);
                }
            }
            return;
        }

        // Process lists
        if (obj instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                findSensitiveFields(list.get(i), path + "[" + i + "]", sensitiveFields);
            }
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

                    String fieldPath = path.isEmpty() ? field.getName() : path + "." + field.getName();

                    if (field.isAnnotationPresent(SensitiveData.class)) {
                        Object value = field.get(obj);
                        if (value != null) {
                            sensitiveFields.add(fieldPath + " = " + (value instanceof String ? "[SENSITIVE]" : value.getClass().getSimpleName()));
                        }
                    }

                    // Recursively process nested objects
                    Object fieldValue = field.get(obj);
                    if (fieldValue != null && !field.getType().isPrimitive() && !field.getType().equals(String.class)) {
                        String fieldName = field.getName();
                        if (!fieldName.equals("parent") && !fieldName.equals("this$0")) {
                            findSensitiveFields(fieldValue, fieldPath, sensitiveFields);
                        }
                    }
                } catch (Exception e) {
                    // Ignore inaccessible fields
                }
            }
            clazz = clazz.getSuperclass();
        }
    }
}