package org.nzbhydra;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The native image metadata is partly written by hand. Nothing fails at build time when an entry points at a class, field or method that was
 * renamed or removed; the native image only misbehaves at runtime. This test checks the entries naming Hydra classes against the code.
 * <p>
 * It cannot find a missing entry. Lifecycle and event listener methods of beans don't need one: Spring AOT registers those itself.
 */
public class NativeMetadataTest {

    private static final String NATIVE_IMAGE_DIR = "src/main/resources/META-INF/native-image/";
    private static final File REFLECT_CONFIG = new File(NATIVE_IMAGE_DIR + "reflect-config.json");
    private static final File REACHABILITY_METADATA = new File(NATIVE_IMAGE_DIR + "org.nzbhydra/core-manual/reachability-metadata.json");

    private static final List<Entry> entries = new ArrayList<>();

    @BeforeAll
    public static void readMetadata() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        for (JsonNode node : objectMapper.readTree(REFLECT_CONFIG)) {
            entries.add(new Entry(REFLECT_CONFIG.getName(), node.get("name").asText(), node));
        }
        for (JsonNode node : objectMapper.readTree(REACHABILITY_METADATA).get("reflection")) {
            entries.add(new Entry(REACHABILITY_METADATA.getName(), node.get("type").asText(), node));
        }
    }

    @Test
    public void shouldOnlyReferenceExistingClassesFieldsAndMethods() {
        List<String> problems = new ArrayList<>();
        for (Entry entry : entries) {
            if (!isCheckedHydraClass(entry.typeName())) {
                continue;
            }
            Class<?> clazz = loadClass(entry.typeName());
            if (clazz == null) {
                problems.add(entry.file() + ": class " + entry.typeName() + " does not exist");
                continue;
            }
            for (JsonNode field : entry.node().path("fields")) {
                String fieldName = field.get("name").asText();
                if (!hasField(clazz, fieldName)) {
                    problems.add(entry.file() + ": field " + entry.typeName() + "." + fieldName + " does not exist");
                }
            }
            for (String methodsKey : List.of("methods", "queriedMethods")) {
                for (JsonNode method : entry.node().path(methodsKey)) {
                    String methodName = method.get("name").asText();
                    if (methodName.startsWith("lambda$")) {
                        //Generated, the number changes with the code
                        continue;
                    }
                    List<String> parameterTypes = new ArrayList<>();
                    method.path("parameterTypes").forEach(x -> parameterTypes.add(x.asText()));
                    if (!hasMethod(clazz, methodName, parameterTypes)) {
                        problems.add(entry.file() + ": method " + entry.typeName() + "." + methodName + "(" + String.join(", ", parameterTypes) + ") does not exist");
                    }
                }
            }
        }
        assertThat(problems).isEmpty();
    }

    private static boolean isCheckedHydraClass(String typeName) {
        //Generated names (CGLIB proxies, lambdas) change with the code that produces them
        //Hibernate metamodel and instantiator classes, package-info and Spring AOT classes only exist in the native build or are negative lookups
        return typeName.startsWith("org.nzbhydra.") && !typeName.contains("$$") && !typeName.endsWith("_") && !typeName.contains("$Hibernate")
               && !typeName.endsWith("package-info") && !typeName.contains("__");
    }

    private static Class<?> loadClass(String typeName) {
        try {
            return Class.forName(typeName, false, NativeMetadataTest.class.getClassLoader());
        } catch (ClassNotFoundException | NoClassDefFoundError e) {
            return null;
        }
    }

    private static boolean hasField(Class<?> clazz, String fieldName) {
        for (Class<?> current = clazz; current != null; current = current.getSuperclass()) {
            try {
                current.getDeclaredField(fieldName);
                return true;
            } catch (NoSuchFieldException ignored) {
                //Look further up
            }
        }
        return false;
    }

    private static boolean hasMethod(Class<?> clazz, String methodName, List<String> parameterTypeNames) {
        Class<?>[] parameterTypes = new Class<?>[parameterTypeNames.size()];
        for (int i = 0; i < parameterTypeNames.size(); i++) {
            parameterTypes[i] = resolveType(parameterTypeNames.get(i));
            if (parameterTypes[i] == null) {
                return false;
            }
        }
        if (methodName.equals("<init>")) {
            try {
                clazz.getDeclaredConstructor(parameterTypes);
                return true;
            } catch (NoSuchMethodException e) {
                return false;
            }
        }
        for (Class<?> current = clazz; current != null; current = current.getSuperclass()) {
            try {
                current.getDeclaredMethod(methodName, parameterTypes);
                return true;
            } catch (NoSuchMethodException ignored) {
                //Look further up
            }
        }
        try {
            //Default methods of interfaces
            clazz.getMethod(methodName, parameterTypes);
            return true;
        } catch (NoSuchMethodException e) {
            return false;
        }
    }

    private static Class<?> resolveType(String typeName) {
        if (typeName.endsWith("[]")) {
            Class<?> componentType = resolveType(typeName.substring(0, typeName.length() - 2));
            return componentType == null ? null : componentType.arrayType();
        }
        return switch (typeName) {
            case "boolean" -> boolean.class;
            case "byte" -> byte.class;
            case "char" -> char.class;
            case "short" -> short.class;
            case "int" -> int.class;
            case "long" -> long.class;
            case "float" -> float.class;
            case "double" -> double.class;
            default -> loadClass(typeName);
        };
    }

    private record Entry(String file, String typeName, JsonNode node) {
    }

}
