package org.nzbhydra.searching;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.IndexerConfig.SourceEnabled;
import org.nzbhydra.database.IndexerStatusEntity;
import org.nzbhydra.searching.infos.InfoProvider;
import org.nzbhydra.searching.searchmodules.Indexer;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class IndexerPicker {

    private static final Logger logger = LoggerFactory.getLogger(IndexerPicker.class);

    @Autowired
    private InfoProvider infoProvider;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
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
            //TODO Account for query generation
            if (!checkSearchId(searchRequest, count, indexer)) {
                continue;
            }

            //TODO CHeck hit and download limit
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
            if (cannotSearchProvidedOrConvertableId) {
                logger.info("Did not pick {} because the search did not provide any ID that the indexer can handle", indexer.getName());
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
        boolean indexerNotSelectedByUser = searchRequest.getSource() == SearchSource.INTERNAL && searchRequest.getIndexers().isPresent() && !searchRequest.getIndexers().get().contains(indexer.getName());
        if (indexerNotSelectedByUser) {
            logger.info("Not picking {} because it was not selected by the user", indexer.getName());
            count.put(indexer, "Not selected by the user");
            return false;
        }
        return true;
    }

    protected boolean checkSearchSource(SearchRequest searchRequest, Map<Indexer, String> count, Indexer indexer) {
        boolean wrongSearchSource = indexer.getConfig().getEnabledForSearchSource() != SourceEnabled.BOTH && !searchRequest.getSource().name().equals(indexer.getConfig().getEnabledForSearchSource().name());
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
