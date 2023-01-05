/*
 *  (C) Copyright 2023 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra;

import lombok.Data;
import org.apache.commons.io.FileUtils;
import org.assertj.core.api.Assertions;
import org.jboss.forge.roaster.Roaster;
import org.jboss.forge.roaster.model.impl.JavaClassImpl;
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

    @Test
    public void ensureAllDataAnnotatedClassesAreMarked() throws Exception {
        final Collection<File> javaFiles = FileUtils.listFiles(new File(""), new String[]{"java"}, true);
        javaFiles.addAll(FileUtils.listFiles(new File("../shared"), new String[]{"java"}, true));
        final Set<String> classesWithMissingReflectionMarker = new HashSet<>();
        for (File javaFile : javaFiles) {
            final JavaSource source;
            source = Roaster.parse(JavaSource.class, javaFile);
            addIfMarkerIsMissing(classesWithMissingReflectionMarker, source);
            if (source instanceof JavaClassSource javaClassSource) {
                addIfMarkerIsMissing(classesWithMissingReflectionMarker, javaClassSource);
            }
        }
        Assertions.assertThat(classesWithMissingReflectionMarker).isEmpty();

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
