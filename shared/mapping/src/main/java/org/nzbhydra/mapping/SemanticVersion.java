package org.nzbhydra.mapping;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Objects;

//Taken from http://blog.onyxbits.de/a-fast-java-parser-for-semantic-versioning-with-correct-precedence-ordering-380/ and adapted

public final class SemanticVersion implements Comparable<SemanticVersion>, Serializable {


    public int major;
    public int minor;
    public int patch;
    public String qualifier;


    public SemanticVersion() {
    }

    public SemanticVersion(int major, int minor, int patch) {
        this(major, minor, patch, null);
    }

    public SemanticVersion(int major, int minor, int patch, String qualifier) {
        if (major < 0 || minor < 0 || patch < 0) {
            throw new IllegalArgumentException("Versionnumbers must be positive!");
        }

        this.major = major;
        this.minor = minor;
        this.patch = patch;
        this.qualifier = qualifier;
    }


    /**
     * Construct a version object by parsing a string.
     *
     * @param version version in flat string format
     */
    public SemanticVersion(String version) {
        setAsString(version);
    }


    /**
     * Convenience method to check if this version is an update.
     *
     * @param v the other version object
     * @return true if this version is newer than the other one.
     */
    public boolean isUpdateFor(SemanticVersion v) {
        return compareTo(v) > 0;
    }

    public boolean isSameOrNewer(SemanticVersion v) {
        return compareTo(v) >= 0;
    }

    /**
     * Convenience method to check if this version is a compatible update.
     *
     * @param v the other version object.
     * @return true if this version is newer and both have the same major version.
     */
    public boolean isCompatibleUpdateFor(SemanticVersion v) {
        return isUpdateFor(v) && (major == v.major);
    }


    @Override
    public String toString() {
        StringBuilder ret = new StringBuilder();
        ret.append(major);
        ret.append('.');
        ret.append(minor);
        ret.append('.');
        ret.append(patch);
        if (qualifier != null) {
            ret.append('-');
            ret.append(qualifier);
        }

        return ret.toString();
    }

    @Override
    public int hashCode() {
        return toString().hashCode(); // Lazy
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof SemanticVersion)) {
            return false;
        }
        SemanticVersion ov = (SemanticVersion) other;
        if (ov.major != major || ov.minor != minor || ov.patch != patch || !Objects.equals(ov.qualifier, qualifier)) {
            return false;
        }

        return true;
    }

    @Override
    public int compareTo(SemanticVersion v) {
        int result = major - v.major;
        if (result == 0) { // Same major
            result = minor - v.minor;
            if (result == 0) { // Same minor
                result = patch - v.patch;
            }
            if (result == 0) {
                if (this.qualifier == null && v.qualifier != null) {
                    return 1;
                }
                if (v.qualifier == null && this.qualifier != null) {
                    return -1;
                }
            }
        }
        return result;
    }

    // Parser implementation below

    private int[] vParts;
    private ArrayList<String> preParts, metaParts;
    private int errPos;
    private char[] input;

    private boolean stateMajor() {
        int pos = 0;
        while (pos < input.length && input[pos] >= '0' && input[pos] <= '9') {
            pos++; // match [0..9]+
        }
        if (pos == 0) { // Empty String -> Error
            return false;
        }

        vParts[0] = Integer.parseInt(new String(input, 0, pos), 10);

        if (input[pos] == '.') {
            return stateMinor(pos + 1);
        }

        return false;
    }

    private boolean stateMinor(int index) {
        int pos = index;
        while (pos < input.length && input[pos] >= '0' && input[pos] <= '9') {
            pos++;// match [0..9]+
        }
        if (pos == index) { // Empty String -> Error
            errPos = index;
            return false;
        }
        vParts[1] = Integer.parseInt(new String(input, index, pos - index), 10);

        if (input[pos] == '.') {
            return statePatch(pos + 1);
        }

        errPos = pos;
        return false;
    }

    private boolean statePatch(int index) {
        int pos = index;
        while (pos < input.length && input[pos] >= '0' && input[pos] <= '9') {
            pos++; // match [0..9]+
        }
        if (pos == index) { // Empty String -> Error
            errPos = index;
            return false;
        }

        vParts[2] = Integer.parseInt(new String(input, index, pos - index), 10);

        if (pos == input.length) { // We have a clean version string
            return true;
        }

        if (input[pos] == '+') { // We have build meta tags -> descend
            return stateMeta(pos + 1);
        }

        if (input[pos] == '-') { // We have pre release tags -> descend
            return stateRelease(pos + 1);
        }

        errPos = pos; // We have junk
        return false;
    }

    private boolean stateRelease(int index) {
        int pos = index;
        while ((pos < input.length)
                && ((input[pos] >= '0' && input[pos] <= '9')
                || (input[pos] >= 'a' && input[pos] <= 'z')
                || (input[pos] >= 'A' && input[pos] <= 'Z') || input[pos] == '-')) {
            pos++; // match [0..9a-zA-Z-]+
        }
        if (pos == index) { // Empty String -> Error
            errPos = index;
            return false;
        }

        preParts.add(new String(input, index, pos - index));
        if (pos == input.length) { // End of input
            return true;
        }
        if (input[pos] == '.') { // More parts -> descend
            return stateRelease(pos + 1);
        }
        if (input[pos] == '+') { // Build meta -> descend
            return stateMeta(pos + 1);
        }

        errPos = pos;
        return false;
    }

    private boolean stateMeta(int index) {
        int pos = index;
        while ((pos < input.length)
                && ((input[pos] >= '0' && input[pos] <= '9')
                || (input[pos] >= 'a' && input[pos] <= 'z')
                || (input[pos] >= 'A' && input[pos] <= 'Z') || input[pos] == '-')) {
            pos++; // match [0..9a-zA-Z-]+
        }
        if (pos == index) { // Empty String -> Error
            errPos = index;
            return false;
        }

        metaParts.add(new String(input, index, pos - index));
        if (pos == input.length) { // End of input
            return true;
        }
        if (input[pos] == '.') { // More parts -> descend
            return stateMeta(pos + 1);
        }
        errPos = pos;
        return false;
    }

    public String getAsString() {
        return toString();
    }

    public void setAsString(String version) {
        if (version.startsWith("v")) {
            version = version.substring(1);
        }
        vParts = new int[3];
        preParts = new ArrayList<String>(5);
        metaParts = new ArrayList<String>(5);
        input = version.replace("v", "").toCharArray();
        if (!stateMajor()) { // Start recursive descend
            throw new RuntimeException("Error whith version number");
        }
        major = vParts[0];
        minor = vParts[1];
        patch = vParts[2];
        if (version.contains("-")) {
            qualifier = version.substring(version.indexOf("-") + 1);
        }
    }


}
