package org.nzbhydra.update;

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

    @Test(expected = ParseException.class)
    public void testWontParse() throws ParseException {
        new SemanticVersion("won't parse");
    }

    @Test(expected = ParseException.class)
    public void testBroken() throws ParseException {
        new SemanticVersion("1..2");
    }

    @Test(expected = IllegalArgumentException.class)
    public void testIdentifiers() {
        String[] ids = {
                "ok", "not_ok"
        };
        new SemanticVersion(0, 0, 0, ids, ids);
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
    }

    @Test
    public void testParseRelease() throws ParseException {
        SemanticVersion v = new SemanticVersion("1.2.3-alpha.1");
        assertEquals(1, v.major);
        assertEquals(2, v.minor);
        assertEquals(3, v.patch);
        assertEquals("alpha", v.preRelase[0]);
        assertEquals("1.2.3-alpha.1", v.toString());
    }

    @Test
    public void testParseReleaseWithLeadingV() throws ParseException {
        SemanticVersion v = new SemanticVersion("v1.2.3-alpha.1");
        assertEquals(1, v.major);
        assertEquals("1.2.3-alpha.1", v.toString());
    }

    @Test
    public void testParseMeta() throws ParseException {
        SemanticVersion v = new SemanticVersion("1.2.3+build.1");
        assertEquals(1, v.major);
        assertEquals(2, v.minor);
        assertEquals(3, v.patch);
        assertEquals("build", v.buildMeta[0]);
        assertEquals("1.2.3+build.1", v.toString());
    }

    @Test
    public void testParseReleaseMeta() throws ParseException {
        SemanticVersion v = new SemanticVersion("1.2.3-alpha.1+build.1");
        assertEquals(1, v.major);
        assertEquals(2, v.minor);
        assertEquals(3, v.patch);
        assertEquals("alpha", v.preRelase[0]);
        assertEquals("build", v.buildMeta[0]);
        assertEquals("1.2.3-alpha.1+build.1", v.toString());
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
        assertTrue(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1,
                1, 0)));
        assertFalse(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1,
                1, 2)));
        assertFalse(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1,
                1, 1)));

        assertTrue(new SemanticVersion(1, 1, 2)
                .isCompatibleUpdateFor(new SemanticVersion(1, 1, 1)));
        assertFalse(new SemanticVersion(2, 1, 1)
                .isCompatibleUpdateFor(new SemanticVersion(1, 1, 0)));
    }

    @Test
    public void testPreRelease() throws ParseException {
        assertTrue(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(
                "1.1.1-alpha")));
        assertFalse(new SemanticVersion("1.1.1-alpha")
                .isUpdateFor(new SemanticVersion("1.1.1-alpha")));
        assertFalse(new SemanticVersion("1.1.1-alpha.1")
                .isUpdateFor(new SemanticVersion("1.1.1-alpha.1.1")));
        assertTrue(new SemanticVersion("1.1.1-alpha.1.one")
                .isUpdateFor(new SemanticVersion("1.1.1-alpha.1.1")));
        assertTrue(new SemanticVersion("1.1.1-alpha.1.one")
                .isUpdateFor(new SemanticVersion("1.1.1-alpha.1.1.1")));
    }
}