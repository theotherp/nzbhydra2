

package org.nzbhydra;

import lombok.Data;
import org.apache.commons.io.FileUtils;
import org.assertj.core.api.Assertions;
import org.jboss.forge.roaster.Roaster;
import org.jboss.forge.roaster.model.source.JavaClassSource;
import org.jboss.forge.roaster.model.source.JavaSource;
import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonLimitsAttributes;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.predicate.RuntimeHintsPredicates;

import java.io.File;
import java.io.Serializable;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

@SuppressWarnings("unchecked")
public class NativeHintsTest {

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

    @Test
    public void shouldRegisterFieldAccessForMarkedClasses() {
        final RuntimeHints hints = new RuntimeHints();
        new NativeHints().registerHints(hints, getClass().getClassLoader());

        //Jackson accesses the field directly when serializing caps as JSON, see #1094
        Assertions.assertThat(RuntimeHintsPredicates.reflection().onFieldAccess(CapsJsonLimitsAttributes.class, "_default")).accepts(hints);
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
