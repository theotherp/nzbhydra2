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

import org.commonmark.renderer.html.HtmlRenderer;
import org.nzbhydra.config.migration.ConfigMigrationStep;
import org.nzbhydra.springnative.ReflectionMarker;
import org.reflections.Reflections;
import org.reflections.scanners.Scanners;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.aot.hint.ExecutableMode;
import org.springframework.aot.hint.MemberCategory;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.boot.actuate.management.ThreadDumpEndpoint;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class NativeHints implements RuntimeHintsRegistrar {

    private static final Logger logger = LoggerFactory.getLogger(NativeHints.class);


    @SuppressWarnings("EmptyTryBlock")
    @Override
    public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
        logger.info("Registering native hints");

        hints.resources().registerResourceBundle("joptsimple.ExceptionMessages");
        hints.resources().registerResourceBundle("org.apache.xerces.impl.msg.XMLMessages");


        final Set<Class<?>> classes = getClassesToRegister();
        classes.add(HashSet.class);
        classes.add(ArrayList.class);
        classes.add(HtmlRenderer.class);
        logger.info("Registering {} classes", classes.size());
        for (Class<?> clazz : classes) {
            hints.reflection().registerType(clazz, MemberCategory.INVOKE_PUBLIC_CONSTRUCTORS);
            for (Method method : clazz.getDeclaredMethods()) {
                hints.reflection().registerMethod(method, ExecutableMode.INVOKE);
            }
        }
        final Set<String> staticResources = getStaticResources();
        logger.info("Loading {} static resources", staticResources.size());
        for (String staticResource : staticResources) {
            //Just load so it can be registered
            try (InputStream resourceAsStream = getClass().getResourceAsStream(staticResource)) {
            } catch (IOException e) {
                logger.error("Error loading resource " + staticResource, e);
            }
        }
        try {
            hints.reflection().registerMethod(MetricsEndpoint.class.getMethod("metric", String.class, List.class), ExecutableMode.INVOKE);
            hints.reflection().registerMethod(MetricsEndpoint.MetricDescriptor.class.getMethod("getMeasurements"), ExecutableMode.INVOKE);
            hints.reflection().registerMethod(ThreadDumpEndpoint.class.getMethod("textThreadDump"), ExecutableMode.INVOKE);
        } catch (NoSuchMethodException e) {
            throw new RuntimeException(e);
        }
    }

    private static Set<Class<?>> getClassesToRegister() {
        final Reflections reflections = new Reflections("org.nzbhydra", Scanners.TypesAnnotated, Scanners.SubTypes);
        final Set<Class<?>> classes = reflections.getTypesAnnotatedWith(ReflectionMarker.class);
        classes.addAll(reflections.getSubTypesOf(ConfigMigrationStep.class));
        return classes;
    }

    private static Set<String> getStaticResources() {
        final Set<String> staticResources = new HashSet<>();
        try {
            final Path path = new PathMatchingResourcePatternResolver().getResource("/").getFile().toPath();
            for (Resource staticResource : new PathMatchingResourcePatternResolver().getResources("static/**")) {
                final File staticResourceFile = staticResource.getFile();
                final String relativePath = path.relativize(staticResourceFile.toPath()).toString();
                staticResources.add(relativePath);
            }
        } catch (IOException e) {
            logger.error("Error getting static resources", e);
        }
        return staticResources;
    }

    public static void main(String[] args) throws Exception {
        final Resource[] staticResources = new PathMatchingResourcePatternResolver().getResources("static/**");
        final Path path = new PathMatchingResourcePatternResolver().getResource("/").getFile().toPath();
        for (Resource staticResource : staticResources) {
            final File staticResourceFile = staticResource.getFile();
            final String relativePath = path.relativize(staticResourceFile.toPath()).toString();

            System.out.println();

        }
    }

}
