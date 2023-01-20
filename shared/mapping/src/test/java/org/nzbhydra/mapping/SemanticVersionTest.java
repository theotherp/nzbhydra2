package org.nzbhydra.mapping;


import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;

import java.text.ParseException;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SemanticVersionTest {

    @Test
    public void testEquality() throws ParseException {
        SemanticVersion v1 = new SemanticVersion("1.2.3-alpha.1+build.2");
        SemanticVersion v2 = new SemanticVersion("1.2.3-alpha.1+build.2");
        assertThat(v2).isEqualTo(v1);
    }


    @Test
    public void testOutOfBounds() {

        Assertions.assertThatThrownBy(() -> {
            new SemanticVersion(-1, 0, 0);
        }).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    public void testParsePlain() throws ParseException {
        SemanticVersion v = new SemanticVersion("1.2.3");
        assertThat(v.major).isEqualTo(1);
        assertThat(v.minor).isEqualTo(2);
        assertThat(v.patch).isEqualTo(3);
        assertThat(v.toString()).isEqualTo("1.2.3");

        v = new SemanticVersion("11.22.33");
        assertThat(v.major).isEqualTo(11);
        assertThat(v.minor).isEqualTo(22);
        assertThat(v.patch).isEqualTo(33);
        assertThat(v.toString()).isEqualTo("11.22.33");

        v = new SemanticVersion("11.22.33-SNAPSHOT");
        assertThat(v.major).isEqualTo(11);
        assertThat(v.minor).isEqualTo(22);
        assertThat(v.patch).isEqualTo(33);
        assertThat(v.qualifier).isEqualTo("SNAPSHOT");
        assertThat(v.toString()).isEqualTo("11.22.33-SNAPSHOT");
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
        assertThat(wrongorder).isEqualTo(inorder);
    }

    @Test
    public void testUpdate() {
        assertTrue(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1, 1, 0)));
        assertThat(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1, 1, 2))).isFalse();
        assertThat(new SemanticVersion(1, 1, 1).isUpdateFor(new SemanticVersion(1, 1, 1))).isFalse();

        assertTrue(new SemanticVersion(1, 0, 0).isUpdateFor(new SemanticVersion(1, 0, 0, "SNAPSHOT")));
        assertTrue(new SemanticVersion(1, 0, 0).isUpdateFor(new SemanticVersion(1, 0, 0, "beta")));

        assertThat(new SemanticVersion(1, 0, 0, "SNAPSHOT").isUpdateFor(new SemanticVersion(1, 0, 0, "SNAPSHOT"))).isFalse();
        assertThat(new SemanticVersion(1, 0, 0, "SNAPSHOT").isUpdateFor(new SemanticVersion(1, 0, 0))).isFalse();
        assertTrue(new SemanticVersion(1, 0, 0, "SNAPSHOT").isSameOrNewer(new SemanticVersion(1, 0, 0, "SNAPSHOT")));

        assertTrue(new SemanticVersion(1, 1, 2).isCompatibleUpdateFor(new SemanticVersion(1, 1, 1)));
        assertThat(new SemanticVersion(2, 1, 1).isCompatibleUpdateFor(new SemanticVersion(1, 1, 0))).isFalse();
    }

}
