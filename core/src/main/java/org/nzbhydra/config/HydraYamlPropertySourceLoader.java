package org.nzbhydra.config;

import org.nzbhydra.config.migration.ConfigMigration;
import org.springframework.beans.factory.config.YamlProcessor;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.yaml.SpringProfileDocumentMatcher;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.Resource;
import org.springframework.util.ClassUtils;
import org.springframework.util.StringUtils;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.nodes.Tag;
import org.yaml.snakeyaml.representer.Representer;
import org.yaml.snakeyaml.resolver.Resolver;

import java.io.IOException;
import java.util.*;
import java.util.Map.Entry;
import java.util.regex.Pattern;

public class HydraYamlPropertySourceLoader extends YamlPropertySourceLoader {

    @Override
    public String[] getFileExtensions() {
        return new String[]{"yml", "yaml"};
    }

    @Override
    public PropertySource<?> load(String name, Resource resource, String profile)
            throws IOException {
        if (ClassUtils.isPresent("org.yaml.snakeyaml.Yaml", null)) {
            Processor processor = new Processor(resource, profile);
            Map<String, Object> source = null;
            try {
                source = processor.process();
            } catch (Exception e) {
                e.printStackTrace(); //Logger not yet initialized
            }
            if (!source.isEmpty()) {
                return new MapPropertySource(name, source);
            }
        }
        return null;
    }


    public static class Processor extends YamlProcessor {

        protected ConfigMigration configMigration = new ConfigMigration();

        Processor(Resource resource, String profile) {
            if (profile == null) {
                setMatchDefault(true);
                setDocumentMatchers(new SpringProfileDocumentMatcher());
            } else {
                setMatchDefault(false);
                setDocumentMatchers(new SpringProfileDocumentMatcher(profile));
            }
            setResources(resource);
        }

        @Override
        protected Yaml createYaml() {
            return new Yaml(new StrictMapAppenderConstructor(), new Representer(),
                    new DumperOptions(), new Resolver() {
                @Override
                public void addImplicitResolver(Tag tag, Pattern regexp,
                                                String first) {
                    if (tag == Tag.TIMESTAMP) {
                        return;
                    }
                    super.addImplicitResolver(tag, regexp, first);
                }
            });
        }

        public Map<String, Object> process() {
            final Map<String, Object> result = new LinkedHashMap<String, Object>();
            process(new MatchCallback() {
                @Override
                public void process(Properties properties, Map<String, Object> map) {
                    //map is now a multi-level map with the structure of the YAML
                    //Now would be a "good" time to migrate settings
                    map = configMigration.migrate(map);
                    result.putAll(getFlattenedMap2(map));
                }
            });
            return result;
        }


        protected final Map<String, Object> getFlattenedMap2(Map<String, Object> source) {
            Map<String, Object> result = new LinkedHashMap<String, Object>();
            buildFlattenedMap(result, source, null);
            return result;
        }

        private void buildFlattenedMap(Map<String, Object> result, Map<String, Object> source, String path) {
            for (Entry<String, Object> entry : source.entrySet()) {
                String key = entry.getKey();
                if (StringUtils.hasText(path)) {
                    if (key.startsWith("[")) {
                        key = path + key;
                    } else {
                        key = path + '.' + key;
                    }
                }
                Object value = entry.getValue();
                if (value instanceof String) {
                    result.put(key, value);
                } else if (value instanceof Map) {
                    // Need a compound key
                    @SuppressWarnings("unchecked")
                    Map<String, Object> map = (Map<String, Object>) value;
                    buildFlattenedMap(result, map, key);
                } else if (value instanceof Collection) {
                    // Need a compound key
                    @SuppressWarnings("unchecked")
                    Collection<Object> collection = (Collection<Object>) value;
                    int count = 0;
                    for (Object object : collection) {
                        buildFlattenedMap(result,
                                Collections.singletonMap("[" + (count++) + "]", object), key);
                    }
                } else {
                    //result.put(key, (value != null ? value : "")); //Original Spring code
                    result.put(key, value); // Actually use null where null was set
                }
            }
        }

    }


}
