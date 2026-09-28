package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The mock server's "minagepaging" indexer returns 20,000 results newest first, spread over ten days, at most 100 per
 * page, and can't filter by minimum age. Result n is titled "minagepaging-n"; result ~14,000 is the first one seven days
 * old. Paging through the younger results would take ~140 queries, far more than the 15 allowed for one search (#1105).
 */
@SystemTest
public class MinAgeSearchSystemTest {

    private static final String QUERY = "minagepaging";
    private static final int FIRST_RESULT_SEVEN_DAYS_OLD = 14_000;

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldFindResultsOlderThanMinAgeBehindManyYoungerOnes() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + QUERY, "minage=7", "limit=100", "indexers=Mock1");

        assertThat(response.status()).isEqualTo(200);
        NewznabXmlRoot root = Jackson.getUnmarshal(response.body());
        List<NewznabXmlItem> items = root.getRssChannel().getItems();
        assertThat(items).hasSize(100);
        assertThat(items).allSatisfy(item -> assertThat(Duration.between(item.getPubDate(), Instant.now()).toDays()).isGreaterThanOrEqualTo(7));

        //The results directly follow each other, starting with the first one old enough. Allow one off because the
        //mock server calculates the dates when it answers
        int firstIndex = indexOf(items.get(0));
        assertThat(firstIndex).isBetween(FIRST_RESULT_SEVEN_DAYS_OLD - 1, FIRST_RESULT_SEVEN_DAYS_OLD + 1);
        for (int i = 0; i < items.size(); i++) {
            assertThat(indexOf(items.get(i))).isEqualTo(firstIndex + i);
        }
    }

    @Test
    public void shouldReturnNothingWhenNoResultIsOldEnough() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=" + QUERY, "minage=20", "limit=100", "indexers=Mock1");

        assertThat(response.status()).isEqualTo(200);
        NewznabXmlRoot root = Jackson.getUnmarshal(response.body());
        assertThat(root.getRssChannel().getItems()).isEmpty();
    }

    private int indexOf(NewznabXmlItem item) {
        return Integer.parseInt(item.getTitle().substring((QUERY + "-").length()));
    }

}
