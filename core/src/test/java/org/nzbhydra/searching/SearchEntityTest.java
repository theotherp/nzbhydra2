package org.nzbhydra.searching;

import com.google.common.collect.Sets;
import org.junit.Test;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;

import java.time.Instant;
import java.util.HashSet;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

public class SearchEntityTest {
    private SearchEntity testee = new SearchEntity();

    @Test
    public void getComparingHash() throws Exception {
        testee.setTime(Instant.now());
        testee.setQuery("query");
        testee.setSeason(1);
        testee.setEpisode("ep");
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        testee.setTitle("title");
        int hash = testee.getComparingHash();
        testee.setTime(Instant.ofEpochMilli(100000L));
        assertEquals(hash, testee.getComparingHash());
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        assertEquals(hash, testee.getComparingHash());
        testee.setSeason(2);
        assertNotEquals(hash, testee.getComparingHash());
        testee.setSeason(1);
        assertEquals(hash, testee.getComparingHash());
        testee.setIdentifiers(new HashSet<>());
        assertNotEquals(hash, testee.getComparingHash());
        testee.setIdentifiers(Sets.newHashSet(new IdentifierKeyValuePair("key", "value")));
        assertEquals(hash, testee.getComparingHash());
    }




}