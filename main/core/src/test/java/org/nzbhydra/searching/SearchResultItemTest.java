package org.nzbhydra.searching;

import org.junit.Test;
import org.mockito.InjectMocks;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class SearchResultItemTest {

    @InjectMocks
    private SearchResultItem testee = new SearchResultItem();

    @Test
    public void compareTo() throws Exception {
        SearchResultItem item1 = new SearchResultItem();
        item1.setPubDate(Instant.now());
        SearchResultItem item2 = new SearchResultItem();
        assertThat(item1.compareTo(item2)).isEqualTo(1);
        assertThat(item2.compareTo(item1)).isEqualTo(-1);
        item1.setPubDate(null);
        assertThat(item2.compareTo(item1)).isEqualTo(0);

        item1.setPubDate(Instant.now());
        item2.setPubDate(item1.getPubDate());
        assertThat(item2.compareTo(item1)).isEqualTo(0);

        item1.setPubDate(Instant.now().minus(1, ChronoUnit.DAYS));
        assertThat(item1.compareTo(item2)).isEqualTo(-1);
    }

}