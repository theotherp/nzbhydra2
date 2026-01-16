

package org.nzbhydra.searching;

import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO;
import org.nzbhydra.searching.dtoseventsenums.SearchResultWebTO.SearchResultWebTOBuilder;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

public class InternalSearchResultProcessorTest {

    @InjectMocks
    private InternalSearchResultProcessor testee = new InternalSearchResultProcessor();


    @Test
    void setSearchResultDateRelatedValues() {

        SearchResultWebTOBuilder builder = SearchResultWebTO.builder();
        SearchResultItem item = new SearchResultItem();
        item.setPubDate(Instant.now().minus(100, ChronoUnit.DAYS)); //Should be ignored when usenet date is set

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.DAYS));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10d");

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.HOURS));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10h");

        item.setUsenetDate(Instant.now().minus(10, ChronoUnit.MINUTES));
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("10m");

        item.setUsenetDate(null);
        builder = testee.setSearchResultDateRelatedValues(builder, item);
        assertThat(builder.build().getAge()).isEqualTo("100d");
    }
}