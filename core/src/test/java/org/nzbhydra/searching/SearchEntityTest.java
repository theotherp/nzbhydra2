package org.nzbhydra.searching;

import com.google.common.collect.Sets;
import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchEntityTO;

import java.time.Instant;
import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

public class SearchEntityTest {
    private final SearchEntity testee = new SearchEntity();

    @Test
    void getComparingHash() throws Exception {
        testee.setTime(Instant.now());
        testee.setQuery("query");
        testee.setSeason(1);
        testee.setEpisode("ep");
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        testee.setTitle("title");
        int hash = testee.getComparingHash();
        testee.setTime(Instant.ofEpochMilli(100000L));
        assertThat(testee.getComparingHash()).isEqualTo(hash);
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        assertThat(testee.getComparingHash()).isEqualTo(hash);
        testee.setSeason(2);
        assertNotEquals(hash, testee.getComparingHash());
        testee.setSeason(1);
        assertThat(testee.getComparingHash()).isEqualTo(hash);
        testee.setIdentifiers(new HashSet<>());
        assertNotEquals(hash, testee.getComparingHash());
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        assertThat(testee.getComparingHash()).isEqualTo(hash);
    }

    @Test
    public void shouldBeConvertibleToTO() throws Exception {
        testee.setTime(Instant.now());
        testee.setQuery("query");
        testee.setSeason(1);
        testee.setEpisode("ep");
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        testee.setTitle("title");
        testee.setSearchType(SearchType.SEARCH);
        testee.setSource(SearchSource.INTERNAL);
        testee.setCategoryName("category");
        testee.setUsername("user");
        testee.setAuthor("author");
        testee.setIp("ip");
        testee.setUserAgent("userAgent");

        final SearchEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, SearchEntityTO.class);
        final String jsonTO = Jackson.JSON_MAPPER.writeValueAsString(to);
        final String jsonEntity = Jackson.JSON_MAPPER.writeValueAsString(testee);
        assertThat(jsonTO).isEqualTo(jsonEntity);

    }

}
