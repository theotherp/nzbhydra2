package com.releaseparser.model;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Contains all parsed information from a movie release title.
 */
public class ReleaseInfo {
    private String originalTitle;
    private String movieTitle;
    private Integer year;
    private Source source;
    private Resolution resolution;
    private Codec codec;
    private String releaseGroup;
    private boolean hardcodedSubs;
    private String hardcodedSubsLanguage;
    private boolean proper;
    private boolean repack;
    private int version;
    private String edition;
    private boolean remux;
    private boolean hdr;
    private boolean dolbyVision;
    private boolean threeDimensional;
    private List<String> languages;

    public ReleaseInfo() {
        this.source = Source.UNKNOWN;
        this.resolution = Resolution.UNKNOWN;
        this.codec = Codec.UNKNOWN;
        this.version = 1;
        this.languages = new ArrayList<>();
    }

    // Getters and Setters
    public String getOriginalTitle() {
        return originalTitle;
    }

    public void setOriginalTitle(String originalTitle) {
        this.originalTitle = originalTitle;
    }

    public String getMovieTitle() {
        return movieTitle;
    }

    public void setMovieTitle(String movieTitle) {
        this.movieTitle = movieTitle;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Source getSource() {
        return source;
    }

    public void setSource(Source source) {
        this.source = source;
    }

    public Resolution getResolution() {
        return resolution;
    }

    public void setResolution(Resolution resolution) {
        this.resolution = resolution;
    }

    public Codec getCodec() {
        return codec;
    }

    public void setCodec(Codec codec) {
        this.codec = codec;
    }

    public String getReleaseGroup() {
        return releaseGroup;
    }

    public void setReleaseGroup(String releaseGroup) {
        this.releaseGroup = releaseGroup;
    }

    public boolean isHardcodedSubs() {
        return hardcodedSubs;
    }

    public void setHardcodedSubs(boolean hardcodedSubs) {
        this.hardcodedSubs = hardcodedSubs;
    }

    public String getHardcodedSubsLanguage() {
        return hardcodedSubsLanguage;
    }

    public void setHardcodedSubsLanguage(String hardcodedSubsLanguage) {
        this.hardcodedSubsLanguage = hardcodedSubsLanguage;
    }

    public boolean isProper() {
        return proper;
    }

    public void setProper(boolean proper) {
        this.proper = proper;
    }

    public boolean isRepack() {
        return repack;
    }

    public void setRepack(boolean repack) {
        this.repack = repack;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getEdition() {
        return edition;
    }

    public void setEdition(String edition) {
        this.edition = edition;
    }

    public boolean isRemux() {
        return remux;
    }

    public void setRemux(boolean remux) {
        this.remux = remux;
    }

    public boolean isHdr() {
        return hdr;
    }

    public void setHdr(boolean hdr) {
        this.hdr = hdr;
    }

    public boolean isDolbyVision() {
        return dolbyVision;
    }

    public void setDolbyVision(boolean dolbyVision) {
        this.dolbyVision = dolbyVision;
    }

    public boolean isThreeDimensional() {
        return threeDimensional;
    }

    public void setThreeDimensional(boolean threeDimensional) {
        this.threeDimensional = threeDimensional;
    }

    public List<String> getLanguages() {
        return languages;
    }

    public void setLanguages(List<String> languages) {
        this.languages = languages;
    }

    public void addLanguage(String language) {
        if (!this.languages.contains(language)) {
            this.languages.add(language);
        }
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("ReleaseInfo{\n");
        sb.append("  originalTitle='").append(originalTitle).append("'\n");
        sb.append("  movieTitle='").append(movieTitle).append("'\n");
        if (year != null) sb.append("  year=").append(year).append("\n");
        sb.append("  source=").append(source.getDisplayName()).append("\n");
        sb.append("  resolution=").append(resolution.getDisplayName()).append("\n");
        sb.append("  codec=").append(codec.getDisplayName()).append("\n");
        if (releaseGroup != null) sb.append("  releaseGroup='").append(releaseGroup).append("'\n");
        if (hardcodedSubs) {
            sb.append("  hardcodedSubs=true");
            if (hardcodedSubsLanguage != null) sb.append(" (").append(hardcodedSubsLanguage).append(")");
            sb.append("\n");
        }
        if (proper) sb.append("  proper=true\n");
        if (repack) sb.append("  repack=true\n");
        if (version > 1) sb.append("  version=").append(version).append("\n");
        if (edition != null) sb.append("  edition='").append(edition).append("'\n");
        if (remux) sb.append("  remux=true\n");
        if (hdr) sb.append("  hdr=true\n");
        if (dolbyVision) sb.append("  dolbyVision=true\n");
        if (threeDimensional) sb.append("  3D=true\n");
        if (!languages.isEmpty()) sb.append("  languages=").append(languages).append("\n");
        sb.append("}");
        return sb.toString();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ReleaseInfo that = (ReleaseInfo) o;
        return Objects.equals(originalTitle, that.originalTitle);
    }

    @Override
    public int hashCode() {
        return Objects.hash(originalTitle);
    }
}
