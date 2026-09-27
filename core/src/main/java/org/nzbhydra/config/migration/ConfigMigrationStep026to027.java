package org.nzbhydra.config.migration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Moves the quick filters that used to be built into the search results page into
 * {@code searching.customQuickFilterButtons} so they can be edited or deleted. They are put in front of the existing
 * custom filters, in the order the page used to show them. Filters sharing a {@code Group:} prefix are ORed with each
 * other, which keeps their old behavior. Preselections of the old built-in filters are rewritten to their new keys.
 */
public class ConfigMigrationStep026to027 implements ConfigMigrationStep {

    private static final Logger logger = LoggerFactory.getLogger(ConfigMigrationStep026to027.class);

    private static final Map<String, String> FORMER_BUILT_IN_FILTERS = new LinkedHashMap<>();
    private static final Map<String, String> PRESELECTION_RENAMES = new LinkedHashMap<>();

    static {
        addFormerBuiltInFilter("source|camts", "Source:CAM / TS", "/cam|ts/");
        addFormerBuiltInFilter("source|tv", "Source:TV", "hdtv");
        addFormerBuiltInFilter("source|web", "Source:WEB", "/webrip|web-dl|webdl/");
        addFormerBuiltInFilter("source|dvd", "Source:DVD", "dvd");
        addFormerBuiltInFilter("source|bluray", "Source:Blu-Ray", "/bluray|blu-ray/");
        addFormerBuiltInFilter("quality|q480p", "Resolution:480p", "480p");
        addFormerBuiltInFilter("quality|q720p", "Resolution:720p", "720p");
        addFormerBuiltInFilter("quality|q1080p", "Resolution:1080p", "1080p");
        addFormerBuiltInFilter("quality|q2160p", "Resolution:2160p", "2160p");
        addFormerBuiltInFilter("other|q3d", "Other:3D", "3d");
        addFormerBuiltInFilter("other|x265", "Other:x265", "x265");
        addFormerBuiltInFilter("other|hevc", "Other:HEVC", "hevc");
        // The config page offered these two keys, which never matched the filters on the results page
        PRESELECTION_RENAMES.put("other|qx265", "custom|Other:x265");
        PRESELECTION_RENAMES.put("other|qhevc", "custom|Other:HEVC");
    }

    private static void addFormerBuiltInFilter(String oldKey, String name, String terms) {
        FORMER_BUILT_IN_FILTERS.put(name, name + "=" + terms);
        PRESELECTION_RENAMES.put(oldKey, "custom|" + name);
    }

    @Override
    public int forVersion() {
        return 26;
    }

    @Override
    public Map<String, Object> migrate(Map<String, Object> toMigrate) {
        final Map<String, Object> searching = getFromMap(toMigrate, "searching");
        if (searching == null) {
            return toMigrate;
        }
        final List<String> existingFilters = getStrings(searching, "customQuickFilterButtons");
        final List<String> filters = new ArrayList<>();
        for (Map.Entry<String, String> entry : FORMER_BUILT_IN_FILTERS.entrySet()) {
            final boolean nameTaken = existingFilters.stream().anyMatch(x -> x.split("=", 2)[0].trim().equals(entry.getKey()));
            if (!nameTaken) {
                filters.add(entry.getValue());
            }
        }
        final int added = filters.size();
        filters.addAll(existingFilters);
        searching.put("customQuickFilterButtons", filters);

        final List<String> preselected = new ArrayList<>();
        for (String key : getStrings(searching, "preselectQuickFilterButtons")) {
            final String newKey = PRESELECTION_RENAMES.getOrDefault(key, key);
            if (!preselected.contains(newKey)) {
                preselected.add(newKey);
            }
        }
        searching.put("preselectQuickFilterButtons", preselected);

        logger.info("Added {} former built-in quick filters to the custom quick filters", added);
        return toMigrate;
    }

    private static List<String> getStrings(Map<String, Object> map, String key) {
        final List<String> strings = new ArrayList<>();
        if (map.get(key) instanceof List<?> list) {
            for (Object entry : list) {
                if (entry instanceof String string) {
                    strings.add(string);
                }
            }
        }
        return strings;
    }

}
