package org.nzbhydra.searching;

import com.google.common.base.Joiner;
import com.google.common.base.Stopwatch;
import com.google.common.collect.Iterables;
import com.google.common.collect.Sets;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchModuleType;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.downloading.NzbDownloadEntity;
import org.nzbhydra.downloading.NzbDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessRepository;
import org.nzbhydra.indexers.IndexerStatusEntity;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoField;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Component
public class IndexerForSearchSelector {

    private static final Logger logger = LoggerFactory.getLogger(IndexerForSearchSelector.class);

    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    private NzbDownloadRepository nzbDownloadRepository;
    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private ApplicationEventPublisher eventPublisher;
    @PersistenceContext
    private EntityManager entityManager;

    private Random random = new Random();

    public IndexerForSearchSelection pickIndexers(SearchRequest searchRequest) {
        return new InnerInstance(searchRequest).pickIndexers();
    }

    protected InnerInstance getInnerInstanceInstance(SearchRequest searchRequest) {
        return new InnerInstance(searchRequest);
    }

    public class InnerInstance {

        protected Map<Indexer, String> notSelectedIndersWithReason = new HashMap<>();
        protected SearchRequest searchRequest;

        public InnerInstance(SearchRequest searchRequest) {
            this.searchRequest = searchRequest;
        }

        public IndexerForSearchSelection pickIndexers() {
            List<Indexer> enabledIndexers = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled()).collect(Collectors.toList());
            if (enabledIndexers.isEmpty()) {
                logger.warn("You don't have any enabled indexers");
                return new IndexerForSearchSelection();
            }

            List<Indexer> selectedIndexers = new ArrayList<>();
            logger.debug("Picking indexers out of " + enabledIndexers.size());

            Stopwatch stopwatch = Stopwatch.createStarted();
            for (Indexer indexer : enabledIndexers) {

                if (!checkIndexerConfigComplete(indexer)) {
                    continue;
                }
                if (!checkSearchSource(indexer)) {
                    continue;
                }
                if (!checkIndexerSelectedByUser(indexer)) {
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
                if (!checkLoadLimiting(indexer)) {
                    continue;
                }
                if (!checkSearchId(indexer)) {
                    continue;
                }
                if (!checkIndexerHitLimit(indexer)) {
                    continue;
                }

                selectedIndexers.add(indexer);
            }
            logger.debug(LoggingMarkers.PERFORMANCE, "Selection of indexers took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
            if (selectedIndexers.isEmpty()) {
                logger.warn("No indexers were selected for this search. You probably don't have any indexers configured which support the provided ID type or all of your indexers which do are currently disabled. You can enable query generation to work around this.");
            } else {
                logger.info("Selected {} out of {} indexers: {}", selectedIndexers.size(), enabledIndexers.size(), Joiner.on(", ").join(selectedIndexers.stream().map(Indexer::getName).collect(Collectors.toList())));
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
            boolean needToSearchById = !searchRequest.getIdentifiers().isEmpty() && !searchRequest.getQuery().isPresent();
            if (needToSearchById) {
                boolean canUseAnyProvidedId = !Collections.disjoint(searchRequest.getIdentifiers().keySet(), indexer.getConfig().getSupportedSearchIds());
                boolean cannotSearchProvidedOrConvertableId = !canUseAnyProvidedId && !infoProvider.canConvertAny(searchRequest.getIdentifiers().keySet(), Sets.newHashSet(indexer.getConfig().getSupportedSearchIds()));
                boolean queryGenerationEnabled = configProvider.getBaseConfig().getSearching().getGenerateQueries().meets(searchRequest.getSource());
                if (cannotSearchProvidedOrConvertableId && !queryGenerationEnabled) {
                    String message = String.format("Not using %s because the search did not provide any ID that the indexer can handle and query generation is disabled", indexer.getName());
                    return handleIndexerNotSelected(indexer, message, "No usable ID");
                }
            }
            return true;
        }

        protected boolean checkLoadLimiting(Indexer indexer) {
            boolean preventedByLoadLimiting = indexer.getConfig().getLoadLimitOnRandom().isPresent() && random.nextInt(indexer.getConfig().getLoadLimitOnRandom().get()) + 1 != 1;
            if (preventedByLoadLimiting) {
                String message = String.format("Not using %s because load limiting prevented it. Chances of it being picked: 1/%d", indexer.getName(), indexer.getConfig().getLoadLimitOnRandom().get());
                return handleIndexerNotSelected(indexer, message, "Disabled temporarily");
            }
            return true;
        }

        protected boolean checkDisabledForCategory(Indexer indexer) {
            boolean indexerDisabledForThisCategory = !indexer.getConfig().getEnabledCategories().isEmpty() && !indexer.getConfig().getEnabledCategories().contains(searchRequest.getCategory().getName());
            if (indexerDisabledForThisCategory) {
                String message = String.format("Not using %s because it's disabled for category %s", indexer.getName(), searchRequest.getCategory().getName());
                return handleIndexerNotSelected(indexer, message, "Disabled for category");
            }
            return true;
        }

        protected boolean checkIndexerStatus(Indexer indexer) {
            IndexerStatusEntity status = indexer.getIndexerEntity().getStatus();
            boolean indexerTemporarilyDisabled = status.getDisabledUntil() != null && status.getDisabledUntil().isAfter(Instant.now());
            if (indexerTemporarilyDisabled) {
                if (configProvider.getBaseConfig().getSearching().isIgnoreTemporarilyDisabled()) {
                    logger.debug("{} is marked as disabled until {} but user chose to ignore this", indexer.getName(), status.getDisabledUntil());
                    return true;
                }
                String message = String.format("Not using %s because it's disabled until %s", indexer.getName(), status.getDisabledUntil().toString());
                return handleIndexerNotSelected(indexer, message, "Disabled temporarily");
            }
            if (status.getDisabledPermanently()) {
                String message = String.format("Not using %s because it's disabled until re-enabled by user", indexer.getName());
                return handleIndexerNotSelected(indexer, message, "Disabled permanently");
            }
            return true;
        }

        protected boolean checkIndexerSelectedByUser(Indexer indexer) {
            boolean indexerNotSelectedByUser =
                    searchRequest.getSource() == SearchSource.INTERNAL
                            && (searchRequest.getIndexers().isPresent() && !searchRequest.getIndexers().get().isEmpty())
                            && !searchRequest.getIndexers().get().contains(indexer.getName());
            if (indexerNotSelectedByUser) {
                //Don't send a search log message for this because showing it to the leader would be useless. He knows he hasn't selected it
                logger.info(String.format("Not using %s because it was not selected by the user", indexer.getName()));
                notSelectedIndersWithReason.put(indexer, "Not selected by the user");
                return false;
            }
            return true;
        }

        protected boolean checkIndexerHitLimit(Indexer indexer) {
            Stopwatch stopwatch = Stopwatch.createStarted();
            IndexerConfig indexerConfig = indexer.getConfig();
            if (!indexerConfig.getHitLimit().isPresent() && !indexerConfig.getDownloadLimit().isPresent()) {
                return true;
            }
            LocalDateTime comparisonTime;
            if (indexerConfig.getHitLimitResetTime().isPresent()) {
                comparisonTime = LocalDateTime.now().with(ChronoField.HOUR_OF_DAY, indexerConfig.getHitLimitResetTime().get());
                if (comparisonTime.isAfter(LocalDateTime.now())) {
                    comparisonTime = comparisonTime.minus(1, ChronoUnit.DAYS);
                }
            } else {
                comparisonTime = LocalDateTime.now().minus(1, ChronoUnit.DAYS);
            }
            if (indexerConfig.getHitLimit().isPresent()) {
                Query query = entityManager.createNativeQuery("SELECT x.TIME FROM INDEXERAPIACCESS_SHORT x WHERE x.INDEXER_ID = (:indexerId) ORDER BY TIME DESC LIMIT (:hitLimit)");
                query.setParameter("indexerId", indexer.getIndexerEntity().getId());
                query.setParameter("hitLimit", indexerConfig.getHitLimit().get());
                List resultList = query.getResultList();

                if (resultList.size() == indexerConfig.getHitLimit().get()) { //Found as many as we want, so now we must check if they're all in the time window
                    Instant earliestAccess = ((Timestamp) Iterables.getLast(resultList)).toInstant();
                    if (earliestAccess.isAfter(comparisonTime.toInstant(ZoneOffset.UTC))) {
                        LocalDateTime nextPossibleHit = calculateNextPossibleHit(indexerConfig, earliestAccess);

                        String message = String.format("Not using %s because all %d allowed API hits were already made. The next API hit should be possible at %s", indexerConfig.getName(), indexerConfig.getHitLimit().get(), nextPossibleHit);
                        logger.debug(LoggingMarkers.PERFORMANCE, "Detection of API limit reached took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
                        return handleIndexerNotSelected(indexer, message, "API hit limit reached");
                    }
                }
            }
            if (indexerConfig.getDownloadLimit().isPresent()) {
                Page<NzbDownloadEntity> page = nzbDownloadRepository.findByIndexerOrderByTimeDesc(indexer.getIndexerEntity(), new PageRequest(0, indexerConfig.getDownloadLimit().get()));
                if (page.getContent().size() == indexerConfig.getDownloadLimit().get() && Iterables.getLast(page.getContent()).getTime().isAfter(comparisonTime.toInstant(ZoneOffset.UTC))) {
                    LocalDateTime nextPossibleHit = calculateNextPossibleHit(indexerConfig, page.getContent().get(page.getContent().size() - 1).getTime());

                    String message = String.format("Not using %s because all %d allowed download were already made. The next download should be possible at %s", indexerConfig.getName(), indexerConfig.getDownloadLimit().get(), nextPossibleHit);
                    logger.debug(LoggingMarkers.PERFORMANCE, "Detection of download limit reached took {}ms", stopwatch.elapsed(TimeUnit.MILLISECONDS));
                    return handleIndexerNotSelected(indexer, message, "Download limit reached");
                }
            }

            logger.debug(LoggingMarkers.PERFORMANCE, "Detection if hit limits were reached for indexer {} took {}ms", indexer.getName(), stopwatch.elapsed(TimeUnit.MILLISECONDS));
            return true; //TODO revert to true
        }

        LocalDateTime calculateNextPossibleHit(IndexerConfig indexerConfig, Instant firstInWindowAccessTime) {
            LocalDateTime nextPossibleHit;
            if (indexerConfig.getHitLimitResetTime().isPresent()) {
                //Next possible hit is at the hour of day defined by the reset time. If that is already in the past we add one hour
                nextPossibleHit = LocalDateTime.now().with(ChronoField.HOUR_OF_DAY, indexerConfig.getHitLimitResetTime().get());
                if (nextPossibleHit.isBefore(LocalDateTime.now())) {
                    nextPossibleHit = nextPossibleHit.plus(1, ChronoUnit.DAYS);
                }
            } else {
                //Next possible hit is at the earlierst 24 hours after the first hit in the hit limit time window (5 hits are limit, the first was made now, then the next hit is available tomorrow at this time)
                nextPossibleHit = LocalDateTime.ofInstant(firstInWindowAccessTime, ZoneOffset.UTC).plus(1, ChronoUnit.DAYS);
            }
            return nextPossibleHit;
        }

        protected boolean checkSearchSource(Indexer indexer) {
            boolean wrongSearchSource = indexer.getConfig().getEnabledForSearchSource() != SearchSourceRestriction.BOTH && !searchRequest.getSource().name().equals(indexer.getConfig().getEnabledForSearchSource().name());
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
                String message = String.format("Not using %s because torznab indexers cannot by used by API NZB searches", indexer.getName());
                return handleIndexerNotSelected(indexer, message, "NZB API search");
            }
            return true;
        }

        private boolean handleIndexerNotSelected(Indexer indexer, String message, String reason) {
            logger.info(message);
            notSelectedIndersWithReason.put(indexer, reason);
            eventPublisher.publishEvent(new SearchMessageEvent(searchRequest, message));
            return false;
        }


    }


    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class IndexerForSearchSelection {
        private Map<Indexer, String> notPickedIndexersWithReason = new HashMap<>();
        private List<Indexer> selectedIndexers = new ArrayList<>();
    }


}
