package org.nzbhydra.indexers;

import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class NzbsOrg extends Newznab {

    private static final Logger logger = LoggerFactory.getLogger(NzbsOrg.class);

    protected String addForbiddenWords(SearchRequest searchRequest, String query) {
        List<String> allForbiddenWords = new ArrayList<>(searchRequest.getInternalData().getForbiddenWords());
        allForbiddenWords.addAll(configProvider.getBaseConfig().getSearching().getForbiddenWords());
        allForbiddenWords.addAll(searchRequest.getCategory().getForbiddenWords());
        List<String> allPossibleForbiddenWords = allForbiddenWords.stream().filter(x -> !(x.contains(" ") || x.contains("-") || x.contains("."))).collect(Collectors.toList());
        if (allForbiddenWords.size() > allPossibleForbiddenWords.size()) {
            logger.debug("Not using some forbidden words in query because characters forbidden by newznab are contained");
        }
        if (!allPossibleForbiddenWords.isEmpty()) {

            StringBuilder queryBuilder = new StringBuilder(query);
            for (String word : allForbiddenWords) {
                if ((queryBuilder + " --" + word).length() < 255) {
                    queryBuilder.append(" --").append(word);
                }
            }
            query = queryBuilder.toString();
        }
        return query;
    }

    protected String addRequiredWords(SearchRequest searchRequest, String query) {
        List<String> allRequiredWords = new ArrayList<>(searchRequest.getInternalData().getRequiredWords());
        allRequiredWords.addAll(configProvider.getBaseConfig().getSearching().getRequiredWords());
        allRequiredWords.addAll(searchRequest.getCategory().getRequiredWords());
        List<String> allPossibleRequiredWords = allRequiredWords.stream().filter(x -> !(x.contains(" ") || x.contains("-") || x.contains("."))).collect(Collectors.toList());
        if (allRequiredWords.size() > allPossibleRequiredWords.size()) {
            logger.debug("Not using some forbidden words in query because characters forbidden by newznab are contained");
        }
        StringBuilder queryBuilder = new StringBuilder(query);
        for (String word : allPossibleRequiredWords) {
            if ((queryBuilder + word).length() < 255) {
                queryBuilder.append(" ").append(queryBuilder);
            }
        }
        query = queryBuilder.toString();

        return query;
    }

    @Override
    protected String cleanupQuery(String query) {

        query = super.cleanupQuery(query);
        if (query.length() > 255) {
            logger.warn("Truncating query because its length is {} but only 255 characters are supported", query.length());
            StringBuilder shorterQuery = new StringBuilder();
            for (String s : query.split(" ")) {
                if ((shorterQuery + s).length() < 255) {
                    shorterQuery.append(" ").append(s);
                } else {
                    break;
                }
            }
            query = shorterQuery.toString();
        }
        return query;
    }

    @Component
    @Order(100)
    public static class NewznabHandlingStrategy implements IndexerHandlingStrategy {

        @Override
        public boolean handlesIndexerConfig(IndexerConfig config) {
            boolean isIndexerNzbsOrg = config != null && config.getSearchModuleType() == SearchModuleType.NEWZNAB && config.getHost().toLowerCase().contains("nzbs.org");
            if (isIndexerNzbsOrg) {
                logger.debug("Will limit queries to nzbs.org to 255 characters");
            }
            return isIndexerNzbsOrg;
        }

        @Override
        public Class<? extends Indexer> getIndexerClass() {
            return NzbsOrg.class;
        }
    }

}
