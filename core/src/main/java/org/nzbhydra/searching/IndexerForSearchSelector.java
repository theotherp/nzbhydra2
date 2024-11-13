package org.nzbhydra.searching;

import com.google.common.base.Joiner;
import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import com.google.common.collect.Iterables;
import com.google.common.collect.Sets;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.category.Category.Subtype;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.status.IndexerLimit;
import org.nzbhydra.indexers.status.IndexerLimitRepository;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.dtoseventsenums.IndexerSelectionEvent;
import org.nzbhydra.searching.dtoseventsenums.SearchMessageEvent;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.springnative.ReflectionMarker;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.RequestScope;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@SuppressWarnings("unchecked")
@Component
@RequestScope
public class IndexerForSearchSelector {

    private static final Logger logger = LoggerFactory.getLogger(IndexerForSearchSelector.class);
    public static final Pattern SCHEDULER_PATTERN = Pattern.compile("(?<day1>(?:mo|tu|we|th|fr|sa|su))?\\-?(?<day2>(?:mo|tu|we|th|fr|sa|su))?(?<hour1>\\d{1,2})?\\-?(?<hour2>\\d{1,2})?", Pattern.CASE_INSENSITIVE);
    private static final Random random = new Random();

    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @PersistenceContext
    private EntityManager entityManager;
    @Autowired
    private IndexerLimitRepository indexerLimitRepository;

    protected Clock clock = Clock.systemUTC();

    private SearchRequest searchRequest;
    protected Map<Indexer, String> notSelectedIndersWithReason = new HashMap<>();


    public IndexerForSearchSelection pickIndexers(SearchRequest searchRequest) {
        this.searchRequest = searchRequest;
        //Check any indexer that's not disabled by the user. If it's disabled by the system it will be deselected with a proper message later
        List<Indexer> eligibleIndexers = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().getState() != IndexerConfig.State.DISABLED_USER).toList();
        if (eligibleIndexers.isEmpty()) {
            logger.warn("You don't have any enabled indexers");
            return new IndexerForSearchSelection();
        }

        List<Indexer> selectedIndexers = new ArrayList<>();
        logger.debug("Picking indexers out of " + eligibleIndexers.size());

        Stopwatch stopwatch = Stopwatch.createStarted();
        for (Indexer indexer : eligibleIndexers) {
            if (!checkInternalAndNotEvenShown(indexer)) {
                continue;
            }
            if (!checkIndexerSelected(indexer)) {
                continue;
            }
            if (!checkIndexerConfigComplete(indexer)) {
                continue;
            }
            if (!checkSearchSource(indexer)) {
                continue;
            }
            if (!checkIndexerStatus(indexer)) {
                continue;
            }
            if (!checkTorznabOnlyUsedForTorrentOrInternalSearches(indexer)) {
                continue;
            }
            if (!checkDisabledForCategory(indexer)) {
                continue;
            }
            if (!checkSchedule(indexer)) {
                continue;
            }
            if (!checkLoadLimiting(indexer)) {
                continue;
            }
            if (!checkSearchId(indexer)) {
                continue;
            }
            if (!checkSearchType(indexer)) {
                continue;
            }
            if (!checkIndexerHitLimit(indexer)) {
                continue;
            }
            if (!checkTooManyFrequentHits(indexer)) {
                continue;
            }

            selectedIndexers.add(indexer);
        }
        logger.debug(LoggingMarkers.PERFORMANCE, "Selection of indexers took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
        if (selectedIndexers.isEmpty()) {
            logger.warn("No indexers were selected for this search. You probably don't have any indexers configured which support the provided ID type or all of your indexers which do are currently disabled. You can enable query generation to work around this.");
        } else {
            logger.info("Selected {} out of {} indexers: {}", selectedIndexers.size(), eligibleIndexers.size(), Joiner.on(", ").join(selectedIndexers.stream().map(Indexer::getName).collect(Collectors.toList())));
        }

        eventPublisher.publishEvent(new IndexerSelectionEvent(searchRequest, selectedIndexers.size()));

        return new IndexerForSearchSelection(notSelectedIndersWithReason, selectedIndexers);
    }

    protected boolean checkIndexerConfigComplete(Indexer indexer) {
        if (!indexer.getConfig().isConfigComplete()) {
            String message = "Not using " + indexer.getName() + " because configuration is not complete. Please open it in the GUI and complete the config. Call the caps check manually to make sure everything is checked.";
            return handleIndexerNotSelected(indexer, message, "Configuration incomplete");
        }
        return true;
    }

    protected boolean checkSearchId(Indexer indexer) {
        boolean needToSearchById = !searchRequest.getIdentifiers().isEmpty() && searchRequest.getQuery().isEmpty();
        if (needToSearchById) {
            boolean canUseAnyProvidedId = !Collections.disjoint(searchRequest.getIdentifiers().keySet(), indexer.getConfig().getSupportedSearchIds());
            boolean cannotSearchProvidedOrConvertableId = !canUseAnyProvidedId && !infoProvider.canConvertAny(searchRequest.getIdentifiers().keySet(), Sets.newHashSet(indexer.getConfig().getSupportedSearchIds()));
            boolean queryGenerationEnabled = searchRequest.meets(configProvider.getBaseConfig().getSearching().getGenerateQueries());
            if (cannotSearchProvidedOrConvertableId && !queryGenerationEnabled) {
                String message = String.format("Not using %s because the search did not provide any ID that the indexer can handle and query generation is disabled", indexer.getName());
                return handleIndexerNotSelected(indexer, message, "No usable ID");
            }
        }
        return true;
    }

    protected boolean checkSearchType(Indexer indexer) {
        boolean audioOrBookSearch = searchRequest.getSearchType() == SearchType.BOOK || searchRequest.getSearchType() == SearchType.MUSIC;
        if (audioOrBookSearch) {
            boolean queryGenerationEnabled = searchRequest.meets(configProvider.getBaseConfig().getSearching().getGenerateQueries());
            boolean indexerSupportsType = indexer.getConfig().getSupportedSearchTypes().stream().anyMatch(x -> searchRequest.getSearchType().matches(x));
            if (!indexerSupportsType && !queryGenerationEnabled) {
                String message = String.format("Not using %s because the search uses type %s which the indexer can't handle and query generation is disabled", searchRequest.getSearchType(), indexer.getName());
                return handleIndexerNotSelected(indexer, message, "Search type not supported");
            }
        }
        return true;
    }

    protected boolean checkLoadLimiting(Indexer indexer) {
        boolean preventedByLoadLimiting = indexer.getConfig().getLoadLimitOnRandom().isPresent() && random.nextInt(indexer.getConfig().getLoadLimitOnRandom().get()) + 1 != 1;
        if (preventedByLoadLimiting) {
            boolean loadLimitIgnored = configProvider.getBaseConfig().getSearching().isIgnoreLoadLimitingForInternalSearches() && searchRequest.getSource() == SearchSource.INTERNAL;
            if (loadLimitIgnored) {
                logger.debug("Ignoring load limiting for internal search");
                return true;
            }
            String message = String.format("Not using %s because load limiting prevented it. Chances of it being picked: 1/%d", indexer.getName(), indexer.getConfig().getLoadLimitOnRandom().get());
            return handleIndexerNotSelected(indexer, message, "Load limiting");
        }
        return true;
    }

    protected boolean checkDisabledForCategory(Indexer indexer) {
        if (searchRequest.getCategory().getSubtype().equals(Subtype.ALL)) {
            return true;
        }
        boolean indexerDisabledForThisCategory = !indexer.getConfig().getEnabledCategories().isEmpty() && !indexer.getConfig().getEnabledCategories().contains(searchRequest.getCategory().getName());
        if (indexerDisabledForThisCategory) {
            String message = String.format("Not using %s because it's disabled for category %s", indexer.getName(), searchRequest.getCategory().getName());
            return handleIndexerNotSelected(indexer, message, "Disabled for category");
        }
        return true;
    }

    protected boolean checkIndexerStatus(Indexer indexer) {
        if (indexer.getConfig().getState() == IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY) {
            if (indexer.getConfig().getDisabledUntil() == null || Instant.ofEpochMilli(indexer.getConfig().getDisabledUntil()).isBefore(clock.instant())) {
                return true;
            }
            String message = String.format("Not using %s because it's disabled until %s due to a previous error ", indexer.getName(), Instant.ofEpochMilli(indexer.getConfig().getDisabledUntil()));
            return handleIndexerNotSelected(indexer, message, "Disabled temporarily because of previous errors");
        }
        if (indexer.getConfig().getState() == IndexerConfig.State.DISABLED_SYSTEM) {
            String message = String.format("Not using %s because it's disabled due to a previous unrecoverable error", indexer.getName());
            return handleIndexerNotSelected(indexer, message, "Disabled permanently because of previous unrecoverable error");
        }
        return true;
    }

    protected boolean checkIndexerSelected(Indexer indexer) {
        if (searchRequest.getIndexers().isEmpty()) {
            return true;
        }
        if (searchRequest.getIndexers().get().isEmpty()) {
            return true;
        }
        boolean indexerNotSelected = !searchRequest.getIndexers().get().contains(indexer.getName());
        if (indexerNotSelected) {
            //Don't send a search log message for this because showing it to the leader would be useless. He knows he hasn't selected it
            logger.info("Not using {} because it's not in selection {}", indexer.getName(), searchRequest.getIndexers().get());
            notSelectedIndersWithReason.put(indexer, "Not selected by the user");
            return false;
        }
        return true;
    }

    /**
     * If an indexer was not shown an the search page (for any reason) it should not be used but also no message should be
     * logged or shown to the user. It doesn't make sense to log "Indexer is incomplete" to the user when he didn't have a chance to even select it
     */
    protected boolean checkInternalAndNotEvenShown(Indexer indexer) {
        if (searchRequest.getSource() == SearchSource.API) {
            return true;
        }

        return indexer.getConfig().isEligibleForInternalSearch();
    }

    protected boolean checkIndexerHitLimit(Indexer indexer) {
        Stopwatch stopwatch = Stopwatch.createStarted();
        IndexerConfig indexerConfig = indexer.getConfig();
        if (indexerConfig.getHitLimit().isEmpty() && indexerConfig.getDownloadLimit().isEmpty()) {
            return true;
        }
        LocalDateTime comparisonTime;
        LocalDateTime now = LocalDateTime.now(clock);
        if (indexerConfig.getHitLimitResetTime().isPresent()) {
            comparisonTime = now.withHour(indexerConfig.getHitLimitResetTime().get());
            if (comparisonTime.isAfter(now)) {
                comparisonTime = comparisonTime.minusDays(1);
            }
        } else {
            comparisonTime = now.minusDays(1);
        }
        if (indexerConfig.getHitLimit().isPresent()) {
            boolean limitExceeded = checkIfHitLimitIsExceeded(indexer, indexerConfig, comparisonTime, IndexerApiAccessType.SEARCH, indexerConfig.getHitLimit().get(), "API hit");
            if (limitExceeded) {
                return false;
            }
        }
        if (indexerConfig.getDownloadLimit().isPresent()) {
            boolean limitExceeded = checkIfHitLimitIsExceeded(indexer, indexerConfig, comparisonTime, IndexerApiAccessType.NZB, indexerConfig.getDownloadLimit().get(), "download");
            if (limitExceeded) {
                return false;
            }
        }

        logger.debug(LoggingMarkers.PERFORMANCE, "Detection that hit limits were not reached for indexer {} took {}ms", indexer.getName(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
        return true;
    }

    /**
     * @return true if more than x hits where made in the last x seconds, false if everything is OK or the indexer isn't know to have such a limit
     */
    private boolean checkTooManyFrequentHits(Indexer indexer) {
        if (!indexer.getConfig().getHost().equalsIgnoreCase("omgwtfnzbs.org")) {
            return true;
        }
        final int limitHits = 300;
        final int timespanSeconds = 300;
        final List recentHitsFromShortHistory = getRecentHitsFromShortHistory(indexer, IndexerApiAccessType.SEARCH, limitHits);
        if (recentHitsFromShortHistory.isEmpty()) {
            logger.debug(LoggingMarkers.LIMITS, "Indexer {}. No recent hits found", indexer.getName());
            return true;
        }
        Instant oldestAccess = ((Timestamp) Iterables.getLast(recentHitsFromShortHistory)).toInstant();
        long oldestSecondsAgo = Instant.now(clock).getEpochSecond() - oldestAccess.getEpochSecond();
        logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Oldest of {} hits was {} seconds ago while only {} hits are allowed in {} seconds", indexer.getName(), limitHits, oldestSecondsAgo, limitHits, timespanSeconds);
        if (oldestAccess.isBefore(Instant.now(clock).minusSeconds(timespanSeconds))) {
            return true;
        }
        logger.info("Not using {} because too many frequent hits were made: More than {} in {} seconds. Oldest of these hits was {} seconds ago", indexer.getName(), limitHits, timespanSeconds, oldestSecondsAgo);
        notSelectedIndersWithReason.put(indexer, "Too many frequent hits");
        return false;
    }

    /**
     * @return false if limit not exceeded, true if exceeded
     */
    private boolean checkIfHitLimitIsExceeded(Indexer indexer, IndexerConfig indexerConfig, LocalDateTime comparisonTime, IndexerApiAccessType accessType, int limit, final String type) {
        Stopwatch stopwatch = Stopwatch.createStarted();

        try {
            //First check if there's usable info in the indexer_status table
            IndexerLimit indexerStatus = indexerLimitRepository.findByIndexer(indexer.getIndexerEntity());
            logger.debug(LoggingMarkers.LIMITS, "Indexer {}. IndexerStatus: {}", indexer.getName(), indexerStatus);
            Instant oldestAccess = null;
            Integer apiHitLimit = indexerStatus.getApiHitLimit();
            if (apiHitLimit == null) {
                apiHitLimit = indexerConfig.getHitLimit().orElse(null);
            }
            if (indexerStatus.getApiHits() != null && accessType != IndexerApiAccessType.NZB && apiHitLimit != null && indexerStatus.getOldestApiHit() != null) {
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Current API hits: {}. Max API hits: {}. Oldest API hit: {}", indexer.getName(), indexerStatus.getApiHits(), apiHitLimit, indexerStatus.getOldestApiHit());
                if (indexerStatus.getApiHits() >= apiHitLimit) {
                    oldestAccess = indexerStatus.getOldestApiHit();
                } else {
                    return false;
                }
            } else {
                Integer downloadLimit = indexerStatus.getDownloadLimit();
                if (downloadLimit == null) {
                    downloadLimit = indexerConfig.getDownloadLimit().orElse(null);
                }
                if (indexerStatus.getDownloads() != null && accessType == IndexerApiAccessType.NZB && downloadLimit != null && indexerStatus.getOldestDownload() != null) {
                    logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Current downloads: {}. Max downloads: {}. Oldest download: {}", indexer.getName(), indexerStatus.getDownloads(), downloadLimit, indexerStatus.getOldestDownload());
                    if (indexerStatus.getDownloads() >= downloadLimit) {
                        oldestAccess = indexerStatus.getOldestDownload();
                    } else {
                        return false;
                    }
                }
            }

            if (oldestAccess != null) {
                if (oldestAccess.isBefore(Instant.now(clock).minus(24, ChronoUnit.HOURS))) {
                    logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Oldest access {} is more than 24 hours old, allowing access", indexer.getName(), oldestAccess);
                    return false;
                }

                Instant nextAccess = oldestAccess.plus(24, ChronoUnit.HOURS);
                String message = String.format("Not using %s because all %d allowed " + type + "s were already made. The next " + type + " should be possible at %s", indexerConfig.getName(), limit, nextAccess);
                logger.debug(LoggingMarkers.PERFORMANCE, "Detection that {} limit has been reached for indexer {} took {}ms", type, indexerConfig.getName(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
                return !handleIndexerNotSelected(indexer, message, type + " limit reached");
            }

            //Check from API short term storage for other indexers
            List resultList = getRecentHitsFromShortHistory(indexer, accessType, limit);
            boolean currentHitsFromApi = false;
            boolean oldestAccessFromApi;

            //currentHits is only the last x results where x is the limit. Only if the oldest is newer than the comparison time (reset time or -24 hours in case of rolling window) is the limit actually reached
            int currentHits;
            //If possible use the hits from the indexer status
            if (accessType != IndexerApiAccessType.NZB && indexerStatus.getApiHits() != null) {
                currentHits = indexerStatus.getApiHits();
                oldestAccess = indexerStatus.getOldestApiHit();
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Got current API hits ({}) and oldest access ({}) from indexerstatus", indexer.getName(), currentHits, oldestAccess);
                currentHitsFromApi = true;

            } else if (accessType == IndexerApiAccessType.NZB && indexerStatus.getDownloads() != null) {
                currentHits = indexerStatus.getDownloads();
                oldestAccess = indexerStatus.getOldestDownload();
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Got current downloads ({}) and oldest access ({}) from indexerstatus", indexer.getName(), currentHits, oldestAccess);
                currentHitsFromApi = true;
            } else {
                currentHits = resultList.size();
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Got current hits ({}) from database", indexer.getName(), currentHits);
            }
            if (currentHits < limit) {
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Current hits {} does not exceed limit of {}", indexer.getName(), currentHits, limit);
                return false;
            }
            //Found as many as we want, so now we must check if they're all in the time window
            if (resultList.isEmpty() && oldestAccess == null) {
                //If we found no results in the history and don't know the last access then the hits (or info) may be very old
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Current hits {} exceeds limit {} but we have no results in list. We'll have to allow it", indexer.getName(), currentHits, limit);
                return true;
            } else if (!resultList.isEmpty() && oldestAccess == null) {
                oldestAccess = ((Timestamp) Iterables.getLast(resultList)).toInstant();
                logger.debug(LoggingMarkers.LIMITS, "Got oldest access ({}) from database", oldestAccess);
            }
            oldestAccessFromApi = (oldestAccess != null);
            final Instant comparisonTimeUtc = comparisonTime.toInstant(ZoneOffset.UTC);
            if (oldestAccess.isAfter(comparisonTimeUtc)) {
                Instant nextPossibleHit = calculateNextPossibleHit(indexerConfig, oldestAccess).toInstant(ZoneOffset.UTC);
                logger.debug(LoggingMarkers.LIMITS, "Indexer {}. oldest access {} is after {}. Not using indexer. Next possible hit at {}", indexer.getName(), oldestAccess, comparisonTimeUtc, nextPossibleHit);

                String message = String.format("Not using %s because all %d allowed " + type + "s were already made. The next " + type + " should be possible at %s", indexerConfig.getName(), limit, nextPossibleHit);
                return !handleIndexerNotSelected(indexer, message, type + " limit reached");
            } else {
                if (oldestAccessFromApi) {
                    logger.debug(LoggingMarkers.LIMITS, "Indexer {}. oldest access from API {} is before {}. Allowing access", indexer.getName(), oldestAccess, comparisonTimeUtc);
                } else {
                    if (currentHitsFromApi) {
                        //If the current hits are from indexer's API response then the number of hits may be outdated (because it's from the last API hit, whenever thay may have been)
                        logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Current hits from API hits ({}) may be outdated. oldest access ({}) is after {} so we'll allow the access", indexer.getName(), currentHits, oldestAccess, comparisonTimeUtc);
                    } else {
                        //
                        logger.debug(LoggingMarkers.LIMITS, "Indexer {}. Current hits is at limit but the oldest access {} is before {}. Allowing access", indexer.getName(), oldestAccess, comparisonTimeUtc);
                    }
                }
            }
            return false;

        } finally {
            logger.debug(LoggingMarkers.PERFORMANCE, "Limit detection for indexer {} took {}ms", indexerConfig.getName(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
        }
    }

    private List getRecentHitsFromShortHistory(Indexer indexer, IndexerApiAccessType accessType, int limit) {
        final String whereApiAccessType;
        if (accessType == IndexerApiAccessType.NZB) {
            whereApiAccessType = "x.API_ACCESS_TYPE = 'NZB'";
        } else {
            whereApiAccessType = "x.API_ACCESS_TYPE = 'NFO' OR x.API_ACCESS_TYPE = 'SEARCH'";
        }
        Query query = entityManager.createNativeQuery("SELECT x.TIME FROM INDEXERAPIACCESS_SHORT x WHERE x.INDEXER_ID = (:indexerId) AND (" + whereApiAccessType + ") ORDER BY TIME DESC LIMIT (:hitLimit)");
        query.setParameter("indexerId", indexer.getIndexerEntity().getId());
        query.setParameter("hitLimit", limit);
        List resultList = query.getResultList();
        return resultList;
    }

    LocalDateTime calculateNextPossibleHit(IndexerConfig indexerConfig, Instant firstInWindowAccessTime) {
        LocalDateTime nextPossibleHit;
        if (indexerConfig.getHitLimitResetTime().isPresent()) {
            //Next possible hit is at the hour of day defined by the reset time. If that is already in the past it will be the next day at that time
            LocalDateTime now = LocalDateTime.now(clock);
            nextPossibleHit = now.withHour(indexerConfig.getHitLimitResetTime().get()).withMinute(0);
            if (nextPossibleHit.isBefore(now)) {
                nextPossibleHit = nextPossibleHit.plusDays(1);
            }
        } else {
            //Next possible hit is at the earlierst 24 hours after the first hit in the hit limit time window (5 hits are limit, the first was made now, then the next hit is available tomorrow at this time)
            nextPossibleHit = LocalDateTime.ofInstant(firstInWindowAccessTime, ZoneOffset.UTC).plusDays(1);
        }
        return nextPossibleHit;
    }

    protected boolean checkSearchSource(Indexer indexer) {
        boolean wrongSearchSource = !searchRequest.meets(indexer.getConfig().getEnabledForSearchSource());
        if (wrongSearchSource) {
            String message = String.format("Not using %s because the search source is %s but the indexer is only enabled for %s searches", indexer.getName(), searchRequest.getSource(), indexer.getConfig().getEnabledForSearchSource());
            return handleIndexerNotSelected(indexer, message, "Not enabled for this search context");
        }
        return true;
    }

    protected boolean checkTorznabOnlyUsedForTorrentOrInternalSearches(Indexer indexer) {
        if (searchRequest.getDownloadType() == DownloadType.TORRENT && indexer.getConfig().getSearchModuleType() != SearchModuleType.TORZNAB) {
            String message = String.format("Not using %s because a torrent search is requested", indexer.getName());
            return handleIndexerNotSelected(indexer, message, "No torrent search");
        }
        if (searchRequest.getDownloadType() == DownloadType.NZB && indexer.getConfig().getSearchModuleType() == SearchModuleType.TORZNAB && searchRequest.getSource() == SearchSource.API) {
            String message = String.format("Not using %s because torznab indexers cannot be used by API NZB searches", indexer.getName());
            return handleIndexerNotSelected(indexer, message, "NZB API search");
        }
        return true;
    }

    protected boolean checkSchedule(Indexer indexer) {
        if (!indexer.getConfig().getSchedule().isEmpty() && indexer.getConfig().getSchedule().stream().noneMatch(this::isInTime)) {
            String message = String.format("Not using %s because the current time is out of its schedule", indexer.getName());
            return handleIndexerNotSelected(indexer, message, "Out of schedule");
        }
        return true;
    }

    protected boolean isInTime(String scheduleTime) {
        Map<String, Integer> days = new HashMap<>();
        days.put("mo", 1);
        days.put("tu", 2);
        days.put("we", 3);
        days.put("th", 4);
        days.put("fr", 5);
        days.put("sa", 6);
        days.put("su", 7);

        LocalDateTime now = LocalDateTime.now(clock);
        Matcher matcher = SCHEDULER_PATTERN.matcher(scheduleTime.toLowerCase());
        if (!matcher.matches()) {
            logger.error("Unable to parse schedule string {}", scheduleTime);
            return false;
        }
        if (matcher.group("day1") != null) {
            int fromDay = days.get(matcher.group("day1"));
            int toDay;
            if (matcher.group("day2") == null) {
                toDay = fromDay;
            } else {
                toDay = days.get(matcher.group("day2"));
            }

            DayOfWeek currentDay = now.getDayOfWeek();
            if (!inRange(fromDay, toDay, currentDay.getValue())) {
                logger.debug(LoggingMarkers.SCHEDULER, "Current date does not match scheduler string {}: Current day {} is not between {} and {}", scheduleTime, currentDay.getDisplayName(TextStyle.FULL, Locale.US), DayOfWeek.of(fromDay).getDisplayName(TextStyle.FULL, Locale.US), DayOfWeek.of(toDay).getDisplayName(TextStyle.FULL, Locale.US));
                return false;
            }
        }

        if (matcher.group("hour1") != null) {
            int fromHour = Integer.parseInt(matcher.group("hour1"));
            int toHour;
            if (matcher.group("hour2") != null) {
                toHour = Integer.parseInt(matcher.group("hour2"));
            } else {
                toHour = fromHour;
            }
            if (fromHour > toHour) {
                if (!(now.getHour() >= fromHour || now.getHour() <= toHour)) {
                    logger.debug(LoggingMarkers.SCHEDULER, "Current date does not match scheduler string {}: Current hour {} is not between {} and {}", scheduleTime, now.getHour(), toHour, fromHour);
                    return false;
                }
            } else if (now.getHour() < fromHour || now.getHour() > toHour) {
                logger.debug(LoggingMarkers.SCHEDULER, "Current date does not match scheduler string {}: Current hour {} is not between {} and {}", scheduleTime, now.getHour(), fromHour, toHour);
                return false;
            }
        }

        return true;
    }

    private boolean inRange(int a, int b, int val) {
        return val >= Math.min(a, b) && val <= Math.max(a, b);
    }

    private boolean handleIndexerNotSelected(Indexer indexer, String message, String reason) {
        notSelectedIndersWithReason.put(indexer, reason);
        if (!Strings.isNullOrEmpty(message)) {
            logger.info(message);
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, message));
        }
        return false;
    }


    @Data
    @ReflectionMarker
    @NoArgsConstructor
    public static class IndexerForSearchSelection {
        private Map<Indexer, String> notPickedIndexersWithReason = new HashMap<>();
        private List<Indexer> selectedIndexers = new ArrayList<>();

        public IndexerForSearchSelection(Map<Indexer, String> notPickedIndexersWithReason, List<Indexer> selectedIndexers) {
            this.notPickedIndexersWithReason = notPickedIndexersWithReason;
            this.selectedIndexers = selectedIndexers;
        }
    }


}
