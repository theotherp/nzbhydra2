package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;

public class SearchResultItemTest {

    @Test
    void compareTo() throws Exception {
        Comparator<SearchResultItem> comparator = SearchResultItem.comparator();
        SearchResultItem item1 = new SearchResultItem();
        item1.setPubDate(Instant.now());
        SearchResultItem item2 = new SearchResultItem();
        assertThat(comparator.compare(item1, item2)).isEqualTo(1);
        assertThat(comparator.compare(item2, item1)).isEqualTo(-1);
        item1.setPubDate(null);
        assertThat(comparator.compare(item2, item1)).isEqualTo(0);

        item1.setPubDate(Instant.now());
        item2.setPubDate(item1.getPubDate());
        assertThat(comparator.compare(item2, item1)).isEqualTo(0);

        item1.setPubDate(Instant.now().minus(1, ChronoUnit.DAYS));
        assertThat(comparator.compare(item1, item2)).isEqualTo(-1);
    }

}