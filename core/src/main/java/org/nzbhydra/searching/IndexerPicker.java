package org.nzbhydra.searching;

import com.google.common.collect.Iterables;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.database.IndexerApiAccessEntity;
import org.nzbhydra.database.IndexerApiAccessRepository;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.database.NzbDownloadEntity;
import org.nzbhydra.database.NzbDownloadRepository;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

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
import java.util.stream.Collectors;

@Component
public class IndexerPicker {

    private static final Logger logger = LoggerFactory.getLogger(IndexerPicker.class);

    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private IndexerApiAccessRepository indexerApiAccessRepository;
    @Autowired
    private NzbDownloadRepository nzbDownloadRepository;
    @Autowired
    private BaseConfig baseConfig;

    private Random random = new Random();

    public PickingResult pickIndexers(SearchRequest searchRequest) {
        List<Indexer> enabledIndexers = searchModuleProvider.getIndexers().stream().filter(x -> x.getConfig().isEnabled()).collect(Collectors.toList());
        if (enabledIndexers.isEmpty()) {
            logger.warn("You have no enabled indexers");
            return new PickingResult();
        }

        List<Indexer> selectedIndexers = new ArrayList<>();
        logger.debug("Picking indexers out of " + enabledIndexers.size());

        Map<Indexer, String> count = new HashMap<>();
        for (Indexer indexer : enabledIndexers) {
            if (!checkSearchSource(searchRequest, count, indexer)) {
                continue;
            }
            if (!checkIndexerSelectedByUser(searchRequest, count, indexer)) {
                continue;
            }
            if (!checkIndexerStatus(count, indexer)) {
                continue;
            }
            if (!checkDisabledForCategory(searchRequest, count, indexer)) {
                continue;
            }
            if (!checkLoadLimiting(count, indexer)) {
                continue;
            }

            if (!checkSearchId(searchRequest, count, indexer)) {
                continue;
            }
            if (!checkIndexerHitLimit(count, indexer)) {
                continue;
            }

            selectedIndexers.add(indexer);
        }
        logger.info("Picked {} out of {} indexers", selectedIndexers.size(), enabledIndexers.size());

        return new PickingResult(count, selectedIndexers);
    }

    protected boolean checkSearchId(SearchRequest searchRequest, Map<Indexer, String> count, Indexer indexer) {
        boolean needToSearchById = !searchRequest.getIdentifiers().isEmpty() && !searchRequest.getQuery().isPresent();
        if (needToSearchById) {
            boolean canUseAnyProvidedId = !Collections.disjoint(searchRequest.getIdentifiers().keySet(), indexer.getConfig().getSupportedSearchIds());
            boolean cannotSearchProvidedOrConvertableId = !canUseAnyProvidedId && !infoProvider.canConvertAny(searchRequest.getIdentifiers().keySet(), indexer.getConfig().getSupportedSearchIds());
            boolean queryGenerationEnabled = baseConfig.getSearching().getGenerateQueries().meets(searchRequest.getSource());
            if (cannotSearchProvidedOrConvertableId && !queryGenerationEnabled) {
                logger.info("Did not pick {} because the search did not provide any ID that the indexer can handle and query generation is disabled", indexer.getName());
                count.put(indexer, "No usable ID");
                return false;
            }
        }
        return true;
    }

    protected boolean checkLoadLimiting(Map<Indexer, String> count, Indexer indexer) {
        boolean preventedByLoadLimiting = indexer.getConfig().getLoadLimitOnRandom().isPresent() && random.nextInt(indexer.getConfig().getLoadLimitOnRandom().get()) + 1 != 1;
        if (preventedByLoadLimiting) {
            logger.info("Did not pick {} because load limiting prevented it. Chances of it being picked: 1/{}", indexer.getName(), indexer.getConfig().getLoadLimitOnRandom().get());
            count.put(indexer, "Disabled temporarily");
            return false;
        }
        return true;
    }

    protected boolean checkDisabledForCategory(SearchRequest searchRequest, Map<Indexer, String> count, Indexer indexer) {
        boolean indexerDisabledForThisCategory = !indexer.getConfig().getCategories().isEmpty() && !indexer.getConfig().getCategories().contains(searchRequest.getCategory().getName());
        if (indexerDisabledForThisCategory) {
            logger.info("Did not pick {} because it's disabled for category {}", indexer.getName(), searchRequest.getCategory().getName());
            count.put(indexer, "Disabled for category");
            return false;
        }
        return true;
    }

    protected boolean checkIndexerStatus(Map<Indexer, String> count, Indexer indexer) {
        IndexerStatusEntity status = indexer.getIndexerEntity().getStatus();
        boolean indexerTemporarilyDisabled = status.getDisabledUntil() != null && status.getDisabledUntil().isAfter(Instant.now()) && !baseConfig.getSearching().isIgnoreTemporarilyDisabled();
        if (indexerTemporarilyDisabled) {
            logger.info("Did not pick {} because it's disabled until {}", indexer.getName(), status.getDisabledUntil());
            count.put(indexer, "\"Disabled temporarily\"");
            return false;
        }
        if (status.getDisabledPermanently()) {
            logger.info("Did not pick {} because it's disabled until re-enabled by user", indexer.getName());
            count.put(indexer, "Disabled permanently");
            return false;
        }
        return true;
    }

    protected boolean checkIndexerSelectedByUser(SearchRequest searchRequest, Map<Indexer, String> count, Indexer indexer) {
        boolean indexerNotSelectedByUser =
                searchRequest.getSource() == SearchSource.INTERNAL
                        && (searchRequest.getIndexers().isPresent() && !searchRequest.getIndexers().get().isEmpty())
                        && !searchRequest.getIndexers().get().contains(indexer.getName());
        if (indexerNotSelectedByUser) {
            logger.info("Not picking {} because it was not selected by the user", indexer.getName());
            count.put(indexer, "Not selected by the user");
            return false;
        }
        return true;
    }

    protected boolean checkIndexerHitLimit(Map<Indexer, String> count, Indexer indexer) {
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
            Page<IndexerApiAccessEntity> page = indexerApiAccessRepository.findByIndexerOrderByTimeDesc(indexer.getIndexerEntity(), new PageRequest(0, indexerConfig.getHitLimit().get()));
            if (page.getContent().size() == indexerConfig.getHitLimit().get() && Iterables.getLast(page.getContent()).getTime().isAfter(comparisonTime.toInstant(ZoneOffset.UTC))) {
                LocalDateTime nextPossibleHit = calculateNextPossibleHit(indexerConfig, page.getContent().get(page.getContent().size() - 1).getTime());

                logger.info("Not picking {} because all {} allowed API hits were already made. The next API hit should be possible at {}", indexerConfig.getName(), indexerConfig.getHitLimit().get(), nextPossibleHit);
                count.put(indexer, "API hit limit reached");
                return false;
            }
        }
        if (indexerConfig.getDownloadLimit().isPresent()) {
            Page<NzbDownloadEntity> page = nzbDownloadRepository.findByIndexerApiAccessIndexerOrderByIndexerApiAccessTimeDesc(indexer.getIndexerEntity(), new PageRequest(0, indexerConfig.getDownloadLimit().get()));
            if (page.getContent().size() == indexerConfig.getDownloadLimit().get() && Iterables.getLast(page.getContent()).getIndexerApiAccess().getTime().isAfter(comparisonTime.toInstant(ZoneOffset.UTC))) {
                LocalDateTime nextPossibleHit = calculateNextPossibleHit(indexerConfig, page.getContent().get(page.getContent().size() - 1).getIndexerApiAccess().getTime());

                logger.info("Not picking {} because all {} allowed download were already made. The next download should be possible at {}", indexerConfig.getName(), indexerConfig.getDownloadLimit().get(), nextPossibleHit);
                count.put(indexer, "Download limit reached");
                return false;
            }
        }

        return true;
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

    protected boolean checkSearchSource(SearchRequest searchRequest, Map<Indexer, String> count, Indexer indexer) {
        boolean wrongSearchSource = indexer.getConfig().getEnabledForSearchSource() != SearchSourceRestriction.BOTH && !searchRequest.getSource().name().equals(indexer.getConfig().getEnabledForSearchSource().name());
        if (wrongSearchSource) {
            logger.info("Not picking {} because the search source is {} but the indexer is only enabled for {} searches", indexer.getName(), searchRequest.getSource(), indexer.getConfig().getEnabledForSearchSource());
            count.put(indexer, "Not enabled for this search context");
            return false;
        }
        return true;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public class PickingResult {
        private Map<Indexer, String> notPickedIndexersWithReason = new HashMap<>();
        private List<Indexer> selectedIndexers = new ArrayList<>();
    }
}
