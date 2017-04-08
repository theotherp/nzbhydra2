package org.nzbhydra.update;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.regex.Pattern;

//Taken from http://blog.onyxbits.de/a-fast-java-parser-for-semantic-versioning-with-correct-precedence-ordering-380/
public final class SemanticVersion implements Comparable<SemanticVersion> {

    /**
     * Major version number
     */
    public final int major;

    /**
     * Minor version number
     */
    public final int minor;

    /**
     * Patch level
     */
    public final int patch;

    /**
     * Pre-release tags (potentially empty, but never null)
     */
    public final String[] preRelase;

    /**
     * Build meta data tags (potentially empty, but never null)
     */
    public final String[] buildMeta;

    /**
     * Construct a new plain version object
     *
     * @param major major version number. Must not be negative
     * @param minor minor version number. Must not be negative
     * @param patch patchlevel. Must not be negative.
     */
    public SemanticVersion(int major, int minor, int patch) {
        this(major, minor, patch, new String[0], new String[0]);
    }

    /**
     * Construct a fully featured version object with all bells and whistles.
     *
     * @param major      major version number (must not be negative)
     * @param minor      minor version number (must not be negative)
     * @param patch      patch level (must not be negative).
     * @param preRelease pre release identifiers. Must not be null, all parts must match
     *                   "[0-9A-Za-z-]+".
     * @param buildMeta  build meta identifiers. Must not be null, all parts must match
     *                   "[0-9A-Za-z-]+".
     */
    public SemanticVersion(int major, int minor, int patch, String[] preRelease,
                           String[] buildMeta) {
        if (major < 0 || minor < 0 || patch < 0) {
            throw new IllegalArgumentException("Versionnumbers must be positive!");
        }
        this.buildMeta = new String[buildMeta.length];
        this.preRelase = new String[preRelease.length];
        Pattern p = Pattern.compile("[0-9A-Za-z-]+");
        for (int i = 0; i < preRelease.length; i++) {
            if (preRelease[i] == null || !p.matcher(preRelease[i]).matches()) {
                throw new IllegalArgumentException("Pre Release tag: " + i);
            }
            this.preRelase[i] = preRelease[i];
        }
        for (int i = 0; i < buildMeta.length; i++) {
            if (buildMeta[i] == null || !p.matcher(buildMeta[i]).matches()) {
                throw new IllegalArgumentException("Build Meta tag: " + i);
            }
            this.buildMeta[i] = buildMeta[i];
        }

        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    /**
     * Convenience constructor for creating a Version object from the
     * "Implementation-Version:" property of the Manifest file.
     *
     * @param clazz a class in the JAR file (or that otherwise has its
     *              implementationVersion attribute set).
     * @throws ParseException if the versionstring does not conform to the semver specs.
     */
    public SemanticVersion(Class<?> clazz) throws ParseException {
        this(clazz.getPackage().getImplementationVersion());
    }

    /**
     * Construct a version object by parsing a string.
     *
     * @param version version in flat string format
     * @throws ParseException if the version string does not conform to the semver specs.
     */
    public SemanticVersion(String version) throws ParseException {
        if (version.startsWith("v")) {
            version = version.substring(1);
        }
        vParts = new int[3];
        preParts = new ArrayList<String>(5);
        metaParts = new ArrayList<String>(5);
        input = version.replace("v", "").toCharArray();
        if (!stateMajor()) { // Start recursive descend
            throw new ParseException(version, errPos);
        }
        major = vParts[0];
        minor = vParts[1];
        patch = vParts[2];
        preRelase = preParts.toArray(new String[preParts.size()]);
        buildMeta = metaParts.toArray(new String[metaParts.size()]);
    }

    /**
     * Check if this version has a given build Meta tags.
     *
     * @param tag the tag to check for.
     * @return true if the tag is found in {@link SemanticVersion#buildMeta}.
     */
    public boolean hasBuildMeta(String tag) {
        for (String s : buildMeta) {
            if (s.equals(tag)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if this version has a given pre release tag.
     *
     * @param tag the tag to check for
     * @return true if the tag is found in {@link SemanticVersion#preRelase}.
     */
    public boolean hasPreRelease(String tag) {
        for (String s : preRelase) {
            if (s.equals(tag)) {
                return true;
            }
        }
        return false;
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

    /**
     * Convenience method to check if this version is a compatible update.
     *
     * @param v the other version object.
     * @return true if this version is newer and both have the same major version.
     */
    public boolean isCompatibleUpdateFor(SemanticVersion v) {
        return isUpdateFor(v) && (major == v.major);
    }

    /**
     * Convenience method to check if this is a stable version.
     *
     * @return true if the major version number is greater than zero and there are
     * no pre release tags.
     */
    public boolean isStable() {
        return major > 0 && preRelase.length == 0;
    }

    @Override
    public String toString() {
        StringBuilder ret = new StringBuilder();
        ret.append(major);
        ret.append('.');
        ret.append(minor);
        ret.append('.');
        ret.append(patch);
        if (preRelase.length > 0) {
            ret.append('-');
            for (int i = 0; i < preRelase.length; i++) {
                ret.append(preRelase[i]);
                if (i < preRelase.length - 1) {
                    ret.append('.');
                }
            }
        }
        if (buildMeta.length > 0) {
            ret.append('+');
            for (int i = 0; i < buildMeta.length; i++) {
                ret.append(buildMeta[i]);
                if (i < buildMeta.length - 1) {
                    ret.append('.');
                }
            }
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
        if (ov.major != major || ov.minor != minor || ov.patch != patch) {
            return false;
        }
        if (ov.preRelase.length != preRelase.length) {
            return false;
        }
        for (int i = 0; i < preRelase.length; i++) {
            if (!preRelase[i].equals(ov.preRelase[i])) {
                return false;
            }
        }
        if (ov.buildMeta.length != buildMeta.length) {
            return false;
        }
        for (int i = 0; i < buildMeta.length; i++) {
            if (!buildMeta[i].equals(ov.buildMeta[i])) {
                return false;
            }
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
                if (result == 0) { // Same patch
                    if (preRelase.length == 0 && v.preRelase.length > 0) {
                        result = 1; // No pre release wins over pre release
                    }
                    if (v.preRelase.length == 0 && preRelase.length > 0) {
                        result = -1; // No pre release wins over pre release
                    }
                    if (preRelase.length > 0 && v.preRelase.length > 0) {
                        int len = Math.min(preRelase.length, v.preRelase.length);
                        int count = 0;
                        for (count = 0; count < len; count++) {
                            result = comparePreReleaseTag(count, v);
                            if (result != 0) {
                                break;
                            }
                        }
                        if (result == 0 && count == len) { // Longer version wins.
                            result = preRelase.length - v.preRelase.length;
                        }
                    }
                }
            }
        }
        return result;
    }

    private int comparePreReleaseTag(int pos, SemanticVersion ov) {
        Integer here = null;
        Integer there = null;
        try {
            here = Integer.parseInt(preRelase[pos], 10);
        } catch (NumberFormatException e) {
        }
        try {
            there = Integer.parseInt(ov.preRelase[pos], 10);
        } catch (NumberFormatException e) {
        }
        if (here != null && there == null) {
            return -1; // Strings take precedence over numbers
        }
        if (here == null && there != null) {
            return 1; // Strings take precedence over numbers
        }
        if (here == null && there == null) {
            return (preRelase[pos].compareTo(ov.preRelase[pos])); // ASCII compare
        }
        return here.compareTo(there); // Number compare
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
}
