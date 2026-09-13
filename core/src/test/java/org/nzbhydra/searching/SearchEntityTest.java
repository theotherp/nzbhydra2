package org.nzbhydra.searching;

import com.google.common.collect.Sets;
import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchEntityTO;
import org.skyscreamer.jsonassert.JSONAssert;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

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
        testee.setMinAge(1);
        testee.setMaxAge(2);
        testee.setMinSize(3);
        testee.setMaxSize(4);
        testee.setSelectedIndexers(Set.of("one", "two"));

        final SearchEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, SearchEntityTO.class);
        final String jsonTO = Jackson.JSON_MAPPER.writeValueAsString(to);
        final String jsonEntity = Jackson.JSON_MAPPER.writeValueAsString(testee);
        JSONAssert.assertEquals(jsonTO, jsonEntity, false);
        assertThat(to.getMinAge()).isEqualTo(1);
        assertThat(to.getMaxAge()).isEqualTo(2);
        assertThat(to.getMinSize()).isEqualTo(3);
        assertThat(to.getMaxSize()).isEqualTo(4);
        assertThat(to.getSelectedIndexers()).containsExactlyInAnyOrder("one", "two");
    }

    @Test
    void shouldKeepAbsentRecentCriteriaNullWhenConvertedToTO() {
        final SearchEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, SearchEntityTO.class);

        assertThat(to.getMinAge()).isNull();
        assertThat(to.getMaxAge()).isNull();
        assertThat(to.getMinSize()).isNull();
        assertThat(to.getMaxSize()).isNull();
        assertThat(to.getSelectedIndexers()).isNull();
    }

}
