package org.nzbhydra.searching;

import com.google.common.hash.Hashing;
import org.nzbhydra.database.SearchResultEntity;

import java.nio.charset.Charset;

public class SearchResultIdCalculator {

    public static long calculateSearchResultId(SearchResultEntity result) {
        return Hashing.goodFastHash(63).hashString((result.getIndexer().getName() + result.getIndexerGuid()), Charset.defaultCharset()).asLong() & Long.MAX_VALUE;
    }

    public static long calculateSearchResultId(SearchResultItem result) {
        return Hashing.goodFastHash(63).hashString((result.getIndexer().getName() + result.getIndexerGuid()), Charset.defaultCharset()).asLong() & Long.MAX_VALUE;
    }
}
