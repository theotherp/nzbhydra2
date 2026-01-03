package org.nzbhydra.searching;

import com.google.common.base.Joiner;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.collect.HashMultiset;
import com.google.common.collect.Multiset;
import com.google.common.collect.Multiset.Entry;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class SearchResultAcceptor {

    private static final Logger logger = LoggerFactory.getLogger(SearchResultAcceptor.class);

    private static final Pattern TITLE_PATTERN = Pattern.compile("(\\w[\\w']*\\w|\\w)");

    private Map<String, List<String>> titleWordCache = new ConcurrentHashMap<>();

    private final ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private final Validator validator = factory.getValidator();


    @Autowired
    private ConfigProvider configProvider;

    public AcceptorResult acceptResults(List<SearchResultItem> items, SearchRequest searchRequest, IndexerConfig indexerConfig) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        BaseConfig baseConfig = configProvider.getBaseConfig();
        titleWordCache = new HashMap<>();
        List<SearchResultItem> acceptedResults = new ArrayList<>();
        Multiset<String> reasonsForRejection = HashMultiset.create();
        HashSet<SearchResultItem> itemsWithoutActualDuplicates = new HashSet<>(items);
        if (itemsWithoutActualDuplicates.size() < items.size()) {
            int removedDuplicates = items.size() - itemsWithoutActualDuplicates.size();
            logger.warn("Removed {} actual duplicates from the results returned by {}. This is likely an error in their code base", removedDuplicates, indexerConfig.getName());
            reasonsForRejection.add("Duplicate results from indexer", removedDuplicates);
        }
        for (SearchResultItem item : itemsWithoutActualDuplicates) {
            if (!checkForNeededAttributesSuccessfullyMapped(reasonsForRejection, item)) {
                continue;
            }
            if (!checkForPassword(reasonsForRejection, item)) {
                continue;
            }
            if (!checkForForbiddenGroup(reasonsForRejection, item)) {
                continue;
            }
            if (!checkForForbiddenPoster(reasonsForRejection, item)) {
                continue;
            }
            if (!checkForSize(searchRequest, reasonsForRejection, item)) {
                continue;
            }
            if (!checkForAge(searchRequest, reasonsForRejection, item)) {
                continue;
            }
            if (!checkForCategoryShouldBeIgnored(searchRequest, reasonsForRejection, item)) {
                continue;
            }
            if (!checkForCategoryDisabledForIndexer(searchRequest, reasonsForRejection, item)) {
                continue;
            }
            if (!checkForLanguage(reasonsForRejection, item)) {
                continue;
            }
            if (!checkMinSeeders(indexerConfig, reasonsForRejection, item)) {
                continue;
            }
            if (!checkAttributeWhitelist(indexerConfig, reasonsForRejection, item)) {
                continue;
            }

            //Forbidden words from query
            if (!checkForForbiddenWords(indexerConfig, reasonsForRejection, searchRequest.getInternalData().getForbiddenWords(), item, "internal data")) {
                continue;
            }

            if (!checkRequiredWords(reasonsForRejection, searchRequest.getInternalData().getRequiredWords(), item, "internal data")) {
                continue;
            }


            //Globally configured
            boolean applyWordAndRegexRestrictions = baseConfig.getSearching().getApplyRestrictions() == SearchSourceRestriction.BOTH || Objects.equals(searchRequest.getSource().name(), baseConfig.getSearching().getApplyRestrictions().name());
            if (applyWordAndRegexRestrictions) {
                if (!checkRegexes(item, reasonsForRejection, baseConfig.getSearching().getRequiredRegex().orElse(null), baseConfig.getSearching().getForbiddenRegex().orElse(null))) {
                    continue;
                }
                if (!checkRequiredWords(reasonsForRejection, baseConfig.getSearching().getRequiredWords(), item, "searching config")) {
                    continue;
                }
                if (!checkForForbiddenWords(indexerConfig, reasonsForRejection, baseConfig.getSearching().getForbiddenWords(), item, "searching config")) {
                    continue;
                }
            }

            //Per category
            applyWordAndRegexRestrictions = item.getCategory().getApplyRestrictionsType() == SearchSourceRestriction.BOTH || Objects.equals(searchRequest.getSource().name(), item.getCategory().getApplyRestrictionsType().name());
            if (applyWordAndRegexRestrictions) {
                if (!checkRegexes(item, reasonsForRejection, item.getCategory().getRequiredRegex().orElse(null), item.getCategory().getForbiddenRegex().orElse(null))) {
                    continue;
                }
                if (!checkRequiredWords(reasonsForRejection, item.getCategory().getRequiredWords(), item, "category")) {
                    continue;
                }
                if (!checkForForbiddenWords(indexerConfig, reasonsForRejection, item.getCategory().getForbiddenWords(), item, "category")) {
                    continue;
                }
            }

            acceptedResults.add(item);
        }
        if (acceptedResults.size() < items.size()) {
            logger.debug("Rejected {} out of {} search results from indexer {}", items.size() - acceptedResults.size(), items.size(), indexerConfig.getName());
            for (Entry<String> entry : reasonsForRejection.entrySet()) {
                logger.info("Rejected {} search results from {} for the following reason: {}", entry.getCount(), indexerConfig.getName(), entry.getElement());
            }
        }

        logger.debug(LoggingMarkers.PERFORMANCE, "Check of {} search results took {}ms", items.size(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return new AcceptorResult(acceptedResults, reasonsForRejection);
    }

    protected boolean checkForNeededAttributesSuccessfullyMapped(Multiset<String> reasonsForRejection, SearchResultItem item) {
        boolean accepted = true;
        Set<ConstraintViolation<SearchResultItem>> constraintViolations = validator.validate(item);
        if (!constraintViolations.isEmpty()) {

            Set<String> messages = new HashSet<>(constraintViolations.size());
            messages.addAll(constraintViolations.stream()
                .map(constraintViolation -> String.format("%s value '%s' %s", constraintViolation.getPropertyPath(),
                    constraintViolation.getInvalidValue(), constraintViolation.getMessage()))
                .toList());
            logger.error("Coding error: SearchResultItem validation messages: {}", Joiner.on(" ").join(messages));
            reasonsForRejection.add("Important data could not be mapped from the indexers returned response");
            return false;
        }
        if (item.getBestDate() == null) {
            logger.error("Coding error: Neither pubdate nor usenet date could be found or parsed");
            accepted = false;
        }
        if (!accepted) {
            reasonsForRejection.add("Important data could not be mapped from the indexers returned response");
            return false;
        }

        return true;
    }

    protected boolean checkForCategoryShouldBeIgnored(SearchRequest searchRequest, Multiset<String> reasonsForRejection, SearchResultItem item) {
        if (searchRequest.meets(item.getCategory().getIgnoreResultsFrom())) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "{} is in forbidden category {}", item.getTitle(), item.getCategory().getName());
            reasonsForRejection.add("In forbidden category");
            return false;
        }
        return true;
    }

    protected boolean checkForCategoryDisabledForIndexer(SearchRequest searchRequest, Multiset<String> reasonsForRejection, SearchResultItem item) {
        List<String> enabledCategories = item.getIndexer().getConfig().getEnabledCategories();
        final String categoryName = item.getCategory().getName();
        if (!item.getCategory().equals(CategoryProvider.naCategory) && !enabledCategories.isEmpty() && !enabledCategories.contains(categoryName)) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "{} is in category {} disabled for indexer {} (enabled are: {})", item.getTitle(), categoryName, item.getIndexer().getName(), enabledCategories);
            reasonsForRejection.add("In forbidden category");
            return false;
        }
        return true;
    }

    protected boolean checkForSize(SearchRequest searchRequest, Multiset<String> reasonsForRejection, SearchResultItem item) {
        boolean isApiAndLimitsShouldApply = item.getCategory().isApplySizeLimitsToApi() && searchRequest.getSource() == SearchSource.API;

        Integer minSize = searchRequest
                .getMinsize()
                .orElse(
                        isApiAndLimitsShouldApply && item.getCategory().getMinSizePreset().isPresent()
                                ? item.getCategory().getMinSizePreset().orElse(null)
                                : null
                );
        if (minSize != null && item.getSize() != null && item.getSize() / (1024 * 1024) < minSize) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "{} is smaller than {}", item.getTitle(), minSize);
            reasonsForRejection.add("Wrong size");
            return false;
        }
        Integer maxSize = searchRequest
                .getMaxsize()
                .orElse(
                        isApiAndLimitsShouldApply && item.getCategory().getMaxSizePreset().isPresent()
                                ? item.getCategory().getMaxSizePreset().orElse(null)
                                : null
                );
        if (maxSize != null && item.getSize() != null && item.getSize() / (1024 * 1024) > maxSize) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "{} is bigger than {}", item.getTitle(), maxSize);
            reasonsForRejection.add("Wrong size");
            return false;
        }
        return true;
    }

    protected boolean checkForAge(SearchRequest searchRequest, Multiset<String> reasonsForRejection, SearchResultItem item) {
        if (searchRequest.getMinage().isPresent() && item.getAgeInDays() < searchRequest.getMinage().get()) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "{} is younger than {} days", item.getTitle(), searchRequest.getMinage().get());
            reasonsForRejection.add("Wrong age");
            return false;
        }
        if (searchRequest.getMaxage().isPresent() && item.getAgeInDays() > searchRequest.getMaxage().get()) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "{} is older than {} days", item.getTitle(), searchRequest.getMaxage().get());
            reasonsForRejection.add("Wrong age");
            return false;
        }
        return true;
    }

    protected boolean checkForForbiddenGroup(Multiset<String> reasonsForRejection, SearchResultItem item) {
        if (item.getGroup().isPresent()) {
            if (configProvider.getBaseConfig().getSearching().getForbiddenGroups().stream().anyMatch(x -> item.getGroup().isPresent() && item.getGroup().get().contains(x))) {
                logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Found forbidden group {}", item.getGroup().get());
                reasonsForRejection.add("In forbidden group");
                return false;
            }
        }
        return true;
    }

    protected boolean checkForForbiddenPoster(Multiset<String> reasonsForRejection, SearchResultItem item) {
        if (item.getPoster().isPresent()) {
            if (configProvider.getBaseConfig().getSearching().getForbiddenPosters().stream().anyMatch(x -> item.getPoster().isPresent() && item.getPoster().get().contains(x))) {
                logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Found forbidden poster {}", item.getPoster().get());
                reasonsForRejection.add("In forbidden poster");
                return false;
            }
        }
        return true;
    }

    protected boolean checkRegexes(SearchResultItem item, Multiset<String> reasonsForRejection, String requiredRegex, String forbiddenRegex) {
        if (!Strings.isNullOrEmpty(requiredRegex)) {
            Pattern requiredPattern = Pattern.compile(requiredRegex, Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
            if (!requiredPattern.matcher(item.getTitle()).find()) {
                logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Did not find required regex in {}", item.getTitle());
                reasonsForRejection.add("Required regex doesn't match");
                return false;
            }
        }
        if (!Strings.isNullOrEmpty(forbiddenRegex)) {
            Pattern forbiddenPattern = Pattern.compile(forbiddenRegex, Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
            if (forbiddenPattern.matcher(item.getTitle()).find()) {
                logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Found forbidden regex in {}", item.getTitle());
                reasonsForRejection.add("Forbidden regex matches");
                return false;
            }
        }

        return true;
    }

    protected boolean checkRequiredWords(Multiset<String> reasonsForRejection, List<String> requiredWords, SearchResultItem item, String source) {
        if (!requiredWords.isEmpty()) {
            List<String> titleWords = getTitleWords(item);
            boolean allPresent = true;
            for (String requiredWord : requiredWords) {
                if (requiredWord.contains(".") || requiredWord.contains("-")) {
                    if (!item.getTitle().toLowerCase().contains(requiredWord.toLowerCase())) {
                        logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Did not find required word {} (from {}) in the title {}", requiredWord, source, item.getTitle());
                        allPresent = false;
                        break;
                    }
                } else {
                    if (!titleWords.contains(requiredWord.toLowerCase())) { //Words must match
                        logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Did not find required word {} (from {}) in the title {}", requiredWord, source, item.getTitle());
                        allPresent = false;
                        break;
                    }
                }
            }
            if (!allPresent) {
                reasonsForRejection.add("No required word found");
                return false;
            }
        }
        return true;
    }

    private synchronized List<String> getTitleWords(SearchResultItem item) {
        return titleWordCache.computeIfAbsent(item.getTitle(), s -> {
            List<String> titleWords = new ArrayList<>();
            Matcher matcher = TITLE_PATTERN.matcher(item.getTitle().toLowerCase());
            while (matcher.find()) {
                titleWords.add(matcher.group().toLowerCase());
            }
            return titleWords;
        });

    }

    protected boolean checkForForbiddenWords(IndexerConfig indexerConfig, Multiset<String> reasonsForRejection, List<String> forbiddenWords, SearchResultItem item, String source) {
        for (String forbiddenWord : forbiddenWords) {
            if (forbiddenWord.contains("-") || forbiddenWord.contains(".") || indexerConfig.getHost().toLowerCase().contains("nzbgeek")) {
                if (item.getTitle().toLowerCase().contains(forbiddenWord.toLowerCase())) {
                    reasonsForRejection.add("Forbidden word");
                    logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Found forbidden word {} (from {}) in title {}", forbiddenWord, source, item.getTitle());
                    return false;
                }
            } else {
                List<String> titleWords = getTitleWords(item);
                Optional<String> found = titleWords.stream().filter(x -> x.equalsIgnoreCase(forbiddenWord)).findFirst(); //Title word must match excluded word to reject result, not just be contained
                if (found.isPresent()) {
                    logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Found forbidden word (from {}) in title word {} (full title: {})", source, found.get(), item.getTitle());
                    reasonsForRejection.add("Forbidden word");
                    return false;
                }
            }
        }
        return true;
    }

    protected boolean checkForPassword(Multiset<String> reasonsForRejection, SearchResultItem item) {
        if (configProvider.getBaseConfig().getSearching().isIgnorePassworded() && item.isPassworded()) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Ignore passworded result");
            reasonsForRejection.add("Ignore passworded");
            return false;
        }
        return true;
    }

    protected boolean checkForLanguage(Multiset<String> reasonsForRejection, SearchResultItem item) {
        final List<String> languagesToKeep = configProvider.getBaseConfig().getSearching().getLanguagesToKeep();
        if (languagesToKeep.isEmpty()) {
            return true;
        }
        if (!item.getAttributes().containsKey("language")) {
            return true;
        }
        final String language = item.getAttributes().get("language");
        if (!languagesToKeep.contains(language)) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Found language {} which is to be filtered", language);
            reasonsForRejection.add("Wrong language");
            return false;
        }
        return true;
    }

    protected boolean checkMinSeeders(IndexerConfig indexerConfig, Multiset<String> reasonsForRejection, SearchResultItem item) {
        if (indexerConfig.getSearchModuleType() != SearchModuleType.TORZNAB) {
            return true;
        }
        final Integer resultSeeders = item.getSeeders();
        if (resultSeeders == null) {
            return true;
        }

        final Integer indexerMinSeeders = indexerConfig.getMinSeeders();
        if (indexerMinSeeders != null && resultSeeders < indexerMinSeeders) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "At least {} seeders expected for results from indexer {} but has {}", indexerConfig.getName(), indexerMinSeeders, resultSeeders);
            reasonsForRejection.add("Not enough seeders");
            return false;
        }

        final Integer mainMinSeeders = configProvider.getBaseConfig().getSearching().getMinSeeders();
        if (mainMinSeeders != null && resultSeeders < mainMinSeeders) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "At least {} seeders expected but has {}", mainMinSeeders, resultSeeders);
            reasonsForRejection.add("Not enough seeders");
            return false;
        }
        return true;
    }

    /**
     * Checks if an item matches the configured attribute whitelist for the indexer.
     * <p>
     * The whitelist uses OR logic between different entries (e.g., ["subs=English", "subs=French"] accepts if EITHER matches).
     * Comma-separated values within one entry use AND logic (e.g., "subs=English,French" requires BOTH to be present).
     * Items without any attributes are rejected when a whitelist is configured.
     * <p>
     * The whitelist can be limited to specific categories. If no categories are configured, the whitelist applies to all results.
     *
     * @param indexerConfig       the indexer configuration containing the whitelist
     * @param reasonsForRejection multiset to track rejection reasons
     * @param item                the search result item to check
     * @return true if the item should be accepted, false if it should be rejected
     */
    protected boolean checkAttributeWhitelist(IndexerConfig indexerConfig, Multiset<String> reasonsForRejection, SearchResultItem item) {
        List<String> whitelist = indexerConfig.getAttributeWhitelist();
        if (whitelist == null || whitelist.isEmpty()) {
            return true;
        }

        // Check if the whitelist should apply to this item's category
        List<String> whitelistCategories = indexerConfig.getAttributeWhitelistCategories();
        if (whitelistCategories != null && !whitelistCategories.isEmpty()) {
            String itemCategoryName = item.getCategory() != null ? item.getCategory().getName() : null;
            if (itemCategoryName == null || !whitelistCategories.contains(itemCategoryName)) {
                // Category not in the whitelist categories - skip attribute filtering for this item
                return true;
            }
        }

        Map<String, String> itemAttributes = item.getAttributes();
        if (itemAttributes == null || itemAttributes.isEmpty()) {
            logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Rejecting '{}' because it has no attributes but attribute whitelist is configured", item.getTitle());
            reasonsForRejection.add("No attributes but whitelist configured");
            return false;
        }

        // Check each whitelist entry - OR logic between entries
        for (String whitelistEntry : whitelist) {
            if (matchesWhitelistEntry(whitelistEntry, itemAttributes)) {
                return true;
            }
        }

        logger.debug(LoggingMarkers.RESULT_ACCEPTOR, "Rejecting '{}' because it doesn't match any attribute whitelist entry", item.getTitle());
        reasonsForRejection.add("Attribute whitelist not matched");
        return false;
    }

    /**
     * Checks if item attributes match a single whitelist entry.
     * For comma-separated values, ALL values must be present (AND logic).
     */
    private boolean matchesWhitelistEntry(String whitelistEntry, Map<String, String> itemAttributes) {
        int equalsIndex = whitelistEntry.indexOf('=');
        if (equalsIndex <= 0 || equalsIndex >= whitelistEntry.length() - 1) {
            logger.error("Invalid whitelist entry format: '{}'", whitelistEntry);
            return false;
        }

        String attributeName = whitelistEntry.substring(0, equalsIndex).trim().toLowerCase();
        String requiredValuesStr = whitelistEntry.substring(equalsIndex + 1).trim();

        // Get the item's value for this attribute (case-insensitive key lookup)
        String itemValue = null;
        for (Map.Entry<String, String> entry : itemAttributes.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(attributeName)) {
                itemValue = entry.getValue();
                break;
            }
        }

        if (itemValue == null) {
            return false;
        }

        // Check if the required values contain commas (AND logic for multiple values)
        if (requiredValuesStr.contains(",")) {
            String[] requiredValues = requiredValuesStr.split(",");
            // ALL values must be present in the item's attribute value
            for (String requiredValue : requiredValues) {
                if (!itemValue.toLowerCase().contains(requiredValue.trim().toLowerCase())) {
                    return false;
                }
            }
            return true;
        } else {
            // Single value - simple case-insensitive comparison
            return itemValue.equalsIgnoreCase(requiredValuesStr);
        }
    }

    @Data
@ReflectionMarker
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AcceptorResult {

        private List<SearchResultItem> acceptedResults;
        private Multiset<String> reasonsForRejection;

        public int getNumberOfRejectedResults() {
            return reasonsForRejection.entrySet().stream().mapToInt(Multiset.Entry::getCount).sum();
        }

    }

}
