

package org.nzbhydra;

import lombok.Data;
import org.apache.commons.io.FileUtils;
import org.assertj.core.api.Assertions;
import org.jboss.forge.roaster.Roaster;
import org.jboss.forge.roaster.model.source.JavaClassSource;
import org.jboss.forge.roaster.model.source.JavaSource;
import org.junit.jupiter.api.Test;
import org.nzbhydra.springnative.ReflectionMarker;

import java.io.File;
import java.io.Serializable;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

@SuppressWarnings("unchecked")
public class NativeHintsTest {

    private static final Set<String> IGNORED_CLASSES = Set.of(
            "org.nzbhydra.Experiments.MainClass.SubEntry.SubSubentry",
            "org.nzbhydra.Experiments.MainClass.SubEntry",
            "org.nzbhydra.Experiments.MainClass"
    );

    @Test
    public void shouldEnsureAllDataAnnotatedClassesAreMarked() throws Exception {
        final Collection<File> javaFiles = FileUtils.listFiles(new File(""), new String[]{"java"}, true);
        javaFiles.addAll(FileUtils.listFiles(new File("../shared"), new String[]{"java"}, true));
        final Set<String> classesWithMissingReflectionMarker = new HashSet<>();
        for (File javaFile : javaFiles) {
            final JavaSource source;
            source = Roaster.parse(JavaSource.class, javaFile);
            addIfMarkerIsMissing(classesWithMissingReflectionMarker, source);
            if (source instanceof JavaClassSource javaClassSource) {
                checkNestedTypes(classesWithMissingReflectionMarker, javaClassSource);
            }
        }
        Assertions.assertThat(classesWithMissingReflectionMarker).isEmpty();

    }

    private static void checkNestedTypes(Set<String> classesWithMissingReflectionMarker, JavaClassSource javaClassSource) {
        for (JavaSource<?> nestedType : javaClassSource.getNestedTypes()) {
            addIfMarkerIsMissing(classesWithMissingReflectionMarker, nestedType);
            if (nestedType instanceof JavaClassSource nestedClassSource) {
                checkNestedTypes(classesWithMissingReflectionMarker, nestedClassSource);
            }
        }
    }

    private static void addIfMarkerIsMissing(Set<String> classesWithMissingReflectionMarker, JavaSource source) {
        if (IGNORED_CLASSES.contains(source.getCanonicalName())) {
            return;
        }
        if (source.hasAnnotation(Data.class) && !source.hasAnnotation(ReflectionMarker.class)) {
            classesWithMissingReflectionMarker.add(source.getCanonicalName());
        }
        if (source instanceof JavaClassSource javaClassSource) {
            if (javaClassSource.hasInterface(Serializable.class) && !source.hasAnnotation(ReflectionMarker.class)) {
                classesWithMissingReflectionMarker.add(source.getCanonicalName());
            }
        }

    }

}
