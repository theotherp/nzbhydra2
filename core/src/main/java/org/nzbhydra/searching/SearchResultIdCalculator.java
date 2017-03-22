package org.nzbhydra.searching;

import org.nzbhydra.database.SearchResultEntity;

public class SearchResultIdCalculator {

    public static int calculateSearchResultId(SearchResultEntity result) {
        return (result.getIndexer().getName() + result.getIndexerGuid()).hashCode();
    }

    public static int calculateSearchResultId(SearchResultItem result) {
        return (result.getIndexer().getName() + result.getIndexerGuid()).hashCode();
    }
}
