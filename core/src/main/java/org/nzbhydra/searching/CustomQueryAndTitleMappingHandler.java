

package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.jetbrains.annotations.Nullable;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.searching.AffectedValue;
import org.nzbhydra.config.searching.CustomQueryAndTitleMapping;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Component
@RestController
public class CustomQueryAndTitleMappingHandler {

    private static final Logger logger = LoggerFactory.getLogger(CustomQueryAndTitleMappingHandler.class);
    private static final Pattern DIACRITICAL_MARKS = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    /**
     * Tests are run against a fixed search type so that every mapping in the list is evaluated regardless of its own search type.
     */
    private static final SearchType TEST_SEARCH_TYPE = SearchType.SEARCH;
    static final int MAX_EXAMPLES = 200;

    @Autowired
    private ConfigProvider configProvider;


    public CustomQueryAndTitleMappingHandler() {
    }

    public CustomQueryAndTitleMappingHandler(BaseConfig baseConfig) {
        this.configProvider = new ConfigProvider() {
            @Override
            public BaseConfig getBaseConfig() {
                return baseConfig;
            }
        };
    }

    public SearchRequest mapSearchRequest(SearchRequest searchRequest) {
        return mapSearchRequest(searchRequest, configProvider.getBaseConfig().getSearching().getCustomMappings());
    }

    public SearchRequest mapSearchRequest(SearchRequest searchRequest, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        if (customQueryAndTitleMappings.isEmpty() || customQueryAndTitleMappings.stream().allMatch(x -> x.getAffectedValue() == AffectedValue.RESULT_TITLE)) {
            return searchRequest;
        }
        final MetaData metaData = mapMetaData(MetaData.fromSearchRequest(searchRequest), customQueryAndTitleMappings);

        metaData.getQuery().ifPresent(searchRequest::setQuery);
        metaData.getTitle().ifPresent(searchRequest::setTitle);
        return searchRequest;
    }


    public SearchResultItem mapSearchResult(SearchResultItem searchResult, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        if (customQueryAndTitleMappings.isEmpty() || customQueryAndTitleMappings.stream().noneMatch(x -> x.getAffectedValue() == AffectedValue.RESULT_TITLE)) {
            return searchResult;
        }
        final MetaData metaData = mapMetaData(MetaData.fromSearchResult(searchResult), customQueryAndTitleMappings);

        metaData.getTitle().ifPresent(searchResult::setTitle);
        return searchResult;
    }

    public static String removeDiacriticalAndUmlauts(String string) {
        return DIACRITICAL_MARKS.matcher(Normalizer.normalize(string, Normalizer.Form.NFD)).replaceAll("")
                .replace("ß", "ss")
                .replace("—", "-");
    }

    public MetaData mapMetaData(MetaData metaData, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        applyMappings(metaData, customQueryAndTitleMappings);
        return metaData;
    }

    /**
     * Applies all mappings which are relevant for the given meta data, in the order they're configured in, stopping after the first applied
     * mapping which matches the whole string.
     *
     * @return the indexes (into the given list) of the mappings which were applied, in the order they were applied
     */
    protected List<Integer> applyMappings(MetaData metaData, List<CustomQueryAndTitleMapping> customQueryAndTitleMappings) {
        if (metaData.getQuery().isPresent()) {
            if (configProvider.getBaseConfig().getSearching().isReplaceUmlauts()) {
                String oldQuery = metaData.getQuery().get();
                final String newQuery = removeDiacriticalAndUmlauts(oldQuery);
                if (!oldQuery.equals(newQuery)) {
                    metaData.setQuery(newQuery);
                    logger.debug("Replaced umlauts. Old query: {}. New query: {}", oldQuery, metaData.getQuery().get());
                }
            }
        }

        final List<Integer> relevantMappingIndexes = new ArrayList<>();
        for (int index = 0; index < customQueryAndTitleMappings.size(); index++) {
            final CustomQueryAndTitleMapping mapping = customQueryAndTitleMappings.get(index);
            if (isRelevant(metaData, mapping)) {
                relevantMappingIndexes.add(index);
            }
        }

        if (relevantMappingIndexes.isEmpty()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "No mappings found matching: {}", metaData);
            return Collections.emptyList();
        }

        final List<Integer> appliedMappingIndexes = new ArrayList<>();
        for (Integer index : relevantMappingIndexes) {
            final CustomQueryAndTitleMapping mapping = customQueryAndTitleMappings.get(index);
            mapMetaData(metaData, mapping);
            appliedMappingIndexes.add(index);
            if (mapping.isMatchAll()) {
                //The mappings in the list have already been matched, so this one was applied and no further mapping may change the value
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Not applying any further mappings after having applied the mapping {} which matches the whole string", mapping);
                break;
            }
        }

        return appliedMappingIndexes;
    }

    /**
     * Mappings for result titles and mappings for search requests must not be applied to the respective other direction. Without this
     * separation a mapping configured for (search request) titles would be applied to result titles and vice versa.
     */
    private boolean isRelevant(MetaData metaData, CustomQueryAndTitleMapping mapping) {
        if (!mapping.isEnabled()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Skipping disabled mapping {}", mapping);
            return false;
        }
        if (metaData.getType() == MetaData.Type.RESULT_TITLE) {
            if (mapping.getAffectedValue() != AffectedValue.RESULT_TITLE) {
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Skipping mapping {} because it doesn't affect result titles", mapping);
                return false;
            }
        } else {
            if (mapping.getAffectedValue() == AffectedValue.RESULT_TITLE) {
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Skipping mapping {} because it only affects result titles", mapping);
                return false;
            }
            if (metaData.getSearchType() != mapping.getSearchType()) {
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Skipping mapping {} because its search type doesn't match {}", mapping, metaData.getSearchType());
                return false;
            }
        }
        if (!isDatasetMatch(metaData, mapping)) {
            return false;
        }
        if (mapping.getTo().contains("{season:") && metaData.getSeason().isEmpty()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use customQueryAndTitleMapping {} because no season information is available for {}", mapping, metaData);
            return false;
        }
        if (mapping.getTo().contains("{episode:") && metaData.getEpisode().isEmpty()) {
            logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Can't use customQueryAndTitleMapping {} because no episode information is available for {}", mapping, metaData);
            return false;
        }
        return true;
    }

    /**
     * Tests the mapping currently being edited and the whole list of mappings against a number of example inputs.
     * <p>
     * All mappings are evaluated as if they affected the query and as if they matched the search type of the test, using season 1 and
     * episode 2, so that the test shows what the mappings do to the example line, not whether it would be used for a specific search.
     */
    @Secured({"ROLE_ADMIN"})
    @PostMapping(value = "/internalapi/customMapping/test", produces = MediaType.APPLICATION_JSON_VALUE)
    public TestResponse testMapping(@RequestBody TestRequest testRequest) {
        final List<String> examples = testRequest.getExamples() == null ? Collections.emptyList() : testRequest.getExamples();
        if (examples.size() > MAX_EXAMPLES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At most " + MAX_EXAMPLES + " examples may be tested at once but " + examples.size() + " were sent");
        }
        final List<CustomQueryAndTitleMapping> mappings = testRequest.getMappings() == null ? Collections.emptyList() : testRequest.getMappings();
        final List<CustomQueryAndTitleMapping> mappingsForTest = mappings.stream().map(CustomQueryAndTitleMappingHandler::forTest).toList();
        final Integer mappingIndex = testRequest.getMappingIndex();
        final boolean testSingleMapping = mappingIndex != null && mappingIndex >= 0 && mappingIndex < mappingsForTest.size();

        final List<TestResult> results = new ArrayList<>();
        for (String example : examples) {
            final SingleMappingResult thisMapping = testSingleMapping ? testSingleMapping(mappingsForTest.get(mappingIndex), example) : null;
            results.add(new TestResult(example, thisMapping, testChain(mappingsForTest, example)));
        }
        return new TestResponse(results);
    }

    /**
     * Returns a copy which is evaluated regardless of the affected value and search type configured for the mapping. Must be a copy because
     * the mappings may come from the config and would be persisted with the changed values.
     */
    private static CustomQueryAndTitleMapping forTest(CustomQueryAndTitleMapping mapping) {
        final CustomQueryAndTitleMapping copy = mapping.copy();
        copy.setAffectedValue(AffectedValue.QUERY);
        copy.setSearchType(TEST_SEARCH_TYPE);
        return copy;
    }

    private SingleMappingResult testSingleMapping(CustomQueryAndTitleMapping mapping, String example) {
        try {
            final boolean matches = mapping.isMatchAll()
                    ? mapping.getFromPattern().matcher(example).matches()
                    : mapping.getFromPattern().matcher(example).find();
            if (!matches) {
                return new SingleMappingResult(false, null, null);
            }
            final MetaData metaData = newTestMetaData(example);
            mapMetaData(metaData, mapping);
            return new SingleMappingResult(true, metaData.getQuery().orElse(null), null);
        } catch (Exception e) {
            return new SingleMappingResult(false, null, getErrorMessage(e));
        }
    }

    private ChainResult testChain(List<CustomQueryAndTitleMapping> mappingsForTest, String example) {
        try {
            final MetaData metaData = newTestMetaData(example);
            final List<Integer> appliedIndices = applyMappings(metaData, mappingsForTest);
            return new ChainResult(metaData.getQuery().orElse(null), appliedIndices, null);
        } catch (Exception e) {
            return new ChainResult(null, Collections.emptyList(), getErrorMessage(e));
        }
    }

    private MetaData newTestMetaData(String example) {
        final MetaData metaData = new MetaData();
        metaData.setType(MetaData.Type.SEARCH_REQUEST);
        metaData.setQuery(example);
        metaData.setSearchType(TEST_SEARCH_TYPE);
        metaData.setSeason(1);
        metaData.setEpisode(2);
        return metaData;
    }

    private static String getErrorMessage(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }


    protected void mapMetaData(MetaData metaData, CustomQueryAndTitleMapping customQueryAndTitleMapping) {
        //What should happen: q=Boku no Hero Academia S4, season=4, ep=21 -> Boku no Hero Academia s04e21
        //What the user should enter roughly: {0:(my hero academia|Boku no Hero Academia) {ignore:.*} -> {0} s{season:00} e{episode:00}
        //How it's configured: "TVSEARCH;QUERY;{0:(my hero academia|Boku no Hero Academia) {ignore:.*};{0} s{season:00} e{episode:00}"

        //{title:the haunting} {0:.*} -> The Haunting of Bly Manor {0}
        //Must not modify the mapping itself because it belongs to the config and would be persisted with the replaced value
        final String replacementTarget = "<remove>".equals(customQueryAndTitleMapping.getTo()) ? "" : customQueryAndTitleMapping.getTo();
        if (customQueryAndTitleMapping.getAffectedValue() == AffectedValue.QUERY && metaData.getQuery().isPresent()) {
            final String newQuery = mapValue(metaData, customQueryAndTitleMapping, metaData.getQuery().get(), replacementTarget);
            metaData.setQuery(newQuery);
        } else if ((customQueryAndTitleMapping.getAffectedValue() == AffectedValue.TITLE || customQueryAndTitleMapping.getAffectedValue() == AffectedValue.RESULT_TITLE) && metaData.getTitle().isPresent()) {
            final String newTitle = mapValue(metaData, customQueryAndTitleMapping, metaData.getTitle().get(), replacementTarget);
            metaData.setTitle(newTitle);
        }
    }

    private String mapValue(MetaData metaData, CustomQueryAndTitleMapping customQueryAndTitleMapping, String value, String replacementTarget) {
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "CustomQueryAndTitleMapping input \"{}\" using dataset \"{}\"", value, customQueryAndTitleMapping);
        String mappedValue = value;

        String replacementRegex = replacementTarget;
        if (metaData.getSeason().isPresent()) {
            replacementRegex = replacementRegex.replace("{season:00}", String.format("%02d", metaData.getSeason().get()));
            replacementRegex = replacementRegex.replace("{season:0}", String.valueOf(metaData.getSeason().get()));
        }
        if (metaData.getEpisode().isPresent()) {
            try {
                Integer episode = metaData.getEpisode().get();
                replacementRegex = replacementRegex.replace("{episode:00}", String.format("%02d", episode));
                replacementRegex = replacementRegex.replace("{episode:0}", episode.toString());
            } catch (NumberFormatException ignored) {
            }
            replacementRegex = replacementRegex.replace("{episode}", String.valueOf(metaData.getEpisode().get()));
        }
        replacementRegex = replacementRegex.replaceAll("\\{(?<groupName>[^\\}]*)\\}", "\\$\\{hydra${groupName}\\}");
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "CustomQueryAndTitleMapping input \"{}\" using replacement regex \"{}\"", value, replacementRegex);
        if (customQueryAndTitleMapping.isMatchAll()) {
            mappedValue = customQueryAndTitleMapping.getFromPattern().matcher(mappedValue).replaceFirst(replacementRegex);
        } else {
            mappedValue = customQueryAndTitleMapping.getFromPattern().matcher(mappedValue).replaceAll(replacementRegex);
        }
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Mapped input \"{}\" to \"{}\"", value, mappedValue);
        return mappedValue;
    }

    protected boolean isDatasetMatch(MetaData metaData, CustomQueryAndTitleMapping customQueryAndTitleMapping) {
        if (customQueryAndTitleMapping.getAffectedValue() == AffectedValue.QUERY && metaData.getQuery().isPresent()) {
            if (customQueryAndTitleMapping.isMatchAll()) {

                final boolean matches = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getQuery().get()).matches();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Query \"{}\" matches regex \"{}\": {}", metaData.getQuery().get(), customQueryAndTitleMapping.getFromPattern().pattern(), matches);
                return matches;
            } else {
                final boolean found = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getQuery().get()).find();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Query \"{}\" contains regex \"{}\": {}", metaData.getQuery().get(), customQueryAndTitleMapping.getFromPattern().pattern(), found);
                return found;
            }
        }

        if ((customQueryAndTitleMapping.getAffectedValue() == AffectedValue.RESULT_TITLE || customQueryAndTitleMapping.getAffectedValue() == AffectedValue.TITLE) && metaData.getTitle().isPresent()) {
            if (customQueryAndTitleMapping.isMatchAll()) {
                final boolean matches = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getTitle().get()).matches();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Title \"{}\" matches regex \"{}\": {}", metaData.getTitle().get(), customQueryAndTitleMapping.getFromPattern().pattern(), matches);
                return matches;
            } else {
                final boolean found = customQueryAndTitleMapping.getFromPattern().matcher(metaData.getTitle().get()).find();
                logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Title \"{}\" contains regex \"{}\": {}", metaData.getTitle().get(), customQueryAndTitleMapping.getFromPattern().pattern(), found);
                return found;
            }
        }
        logger.debug(LoggingMarkers.CUSTOM_MAPPING, "Dataset does not match search request.\nDataset: {}\nSearch request:{}", customQueryAndTitleMapping.getFrom(), metaData);
        return false;
    }

    /**
     * The whole list of mappings as currently edited, the index of the mapping being edited (absent or negative if only the chain is to be
     * tested) and the example inputs to run against them.
     */
    @Data
    @ReflectionMarker
    public static class TestRequest {
        private List<CustomQueryAndTitleMapping> mappings = new ArrayList<>();
        /**
         * Boxed on purpose: a primitive would default to 0 for an absent value and silently test the first mapping.
         */
        private Integer mappingIndex;
        private List<String> examples = new ArrayList<>();
    }


    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TestResponse {
        private List<TestResult> results = new ArrayList<>();
    }

    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TestResult {
        private String input;
        /**
         * Null if no (valid) mapping index was sent, i.e. only the chain was tested.
         */
        private SingleMappingResult thisMapping;
        private ChainResult chain;
    }

    /**
     * The result of running the edited mapping alone against an example. The boolean is serialized as "match".
     */
    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SingleMappingResult {
        private boolean match;
        private String output;
        private String error;
    }

    /**
     * The result of running the whole list of mappings against an example. The applied indices refer to the mappings as sent in the request.
     */
    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ChainResult {
        private String output;
        private List<Integer> appliedIndices = new ArrayList<>();
        private String error;
    }

    @Data
    @ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class MetaData {
        enum Type {
            SEARCH_REQUEST,
            RESULT_TITLE
        }

        private Type type;
        private SearchType searchType;
        private String title;
        private String query;
        private Integer season;
        private Integer episode;

        public Optional<String> getTitle() {
            return Optional.ofNullable(title);
        }

        public Optional<String> getQuery() {
            return Optional.ofNullable(query);
        }

        public Optional<Integer> getSeason() {
            return Optional.ofNullable(season);
        }

        public Optional<Integer> getEpisode() {
            return Optional.ofNullable(episode);
        }

        public static MetaData fromSearchRequest(SearchRequest searchRequest) {
            Integer episode;
            if (searchRequest.getEpisode().isPresent()) {
                try {
                    episode = Integer.parseInt(searchRequest.getEpisode().get());
                } catch (NumberFormatException e) {
                    episode = null;
                }
            } else {
                episode = null;
            }

            return new MetaData(Type.SEARCH_REQUEST, searchRequest.getSearchType(), searchRequest.getTitle().orElse(null), searchRequest.getQuery().orElse(null), searchRequest.getSeason().orElse(null), episode);
        }

        public static MetaData fromSearchResult(SearchResultItem result) {
            Integer season = getIntegerAttribute(result, "season");
            Integer episode = getIntegerAttribute(result, "episode");
            return new MetaData(Type.RESULT_TITLE, null, result.getTitle(), null, season, episode);
        }

        @Nullable
        private static Integer getIntegerAttribute(SearchResultItem result, String attribute) {
            Integer integer = null;
            if (result.getAttributes().containsKey(attribute)) {
                try {
                    integer = Integer.parseInt(result.getAttributes().get(attribute));
                } catch (NumberFormatException ignored) {
                }
            }
            return integer;
        }


    }

}
