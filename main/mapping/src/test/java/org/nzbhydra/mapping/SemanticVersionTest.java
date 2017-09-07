package org.nzbhydra.mapping;

import org.junit.Test;

import java.text.ParseException;
import java.util.Arrays;

import static junit.framework.TestCase.assertFalse;
import static junit.framework.TestCase.assertTrue;
import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;

public class SemanticVersionTest {

    @Test
    public void testEquality() throws ParseException {
        SemanticVersion v1 = new SemanticVersion("1.2.3-alpha.1+build.2");
        SemanticVersion v2 = new SemanticVersion("1.2.3-alpha.1+build.2");
        assertEquals(v1, v2);
    }


    @Test(expected = IllegalArgumentException.class)
    public void testOutOfBounds() {
        new SemanticVersion(-1, 0, 0);
    }

    @Test
    public void testParsePlain() throws ParseException {
        SemanticVersion v = new SemanticVersion("1.2.3");
        assertEquals(1, v.major);
        assertEquals(2, v.minor);
        assertEquals(3, v.patch);
        assertEquals("1.2.3", v.toString());

        v = new SemanticVersion("11.22.33");
        assertEquals(11, v.major);
        assertEquals(22, v.minor);
        assertEquals(33, v.patch);
        assertEquals("11.22.33", v.toString());

        v = new SemanticVersion("11.22.33-SNAPSHOT");
        assertEquals(11, v.major);
        assertEquals(22, v.minor);
        assertEquals(33, v.patch);
        assertEquals("SNAPSHOT", v.qualifier);
        assertEquals("11.22.33-SNAPSHOT", v.toString());
    }


    @Test
    public void testNewer() {
        SemanticVersion[] inorder = {
                new SemanticVersion(0, 1, 4), new SemanticVersion(1, 1, 1),
                new SemanticVersion(1, 2, 1), new SemanticVersion(1, 2, 3)
        };

        SemanticVersion[] wrongorder = {
                inorder[0], inorder[3], inorder[1], inorder[2]
        };

        Arrays.sort(wrongorder);
        assertArrayEquals(inorder, wrongorder);
    }

    @Test
    public void testUpdate() {
        assertTrue(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1, 1, 0)));
        assertFalse(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1, 1, 2)));
        assertFalse(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1, 1, 1)));

        assertTrue(new SemanticVersion(1, 0, 0).isUpdateFor(new SemanticVersion(1, 0, 0, "SNAPSHOT")));

        assertFalse(new SemanticVersion(1, 0, 0, "SNAPSHOT").isUpdateFor(new SemanticVersion(1, 0, 0, "SNAPSHOT")));
        assertFalse(new SemanticVersion(1, 0, 0, "SNAPSHOT").isUpdateFor(new SemanticVersion(1, 0, 0)));
        assertTrue(new SemanticVersion(1, 0, 0, "SNAPSHOT").isSameOrNewer(new SemanticVersion(1, 0, 0, "SNAPSHOT")));

        assertTrue(new SemanticVersion(1, 1, 2).isCompatibleUpdateFor(new SemanticVersion(1, 1, 1)));
        assertFalse(new SemanticVersion(2, 1, 1).isCompatibleUpdateFor(new SemanticVersion(1, 1, 0)));
    }

}