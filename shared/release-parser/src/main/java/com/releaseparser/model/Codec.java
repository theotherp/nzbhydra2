package com.releaseparser.model;

/**
 * Video codec types with efficiency rankings.
 * Higher efficiency means better quality at same bitrate, or smaller file at same quality.
 */
public enum Codec {
    UNKNOWN(0, "Unknown", "Unknown codec"),
    DIVX(1, "DivX", "Legacy MPEG-4 Part 2 codec"),
    XVID(2, "XviD", "Open source MPEG-4 Part 2 codec"),
    H264(3, "H.264", "AVC/H.264 - widely compatible"),
    X264(4, "x264", "High quality H.264 encoder"),
    H265(5, "H.265", "HEVC - better compression than H.264"),
    X265(6, "x265", "High quality HEVC encoder"),
    AV1(7, "AV1", "Next-gen open codec - best compression");

    private final int efficiencyRank;
    private final String displayName;
    private final String description;

    Codec(int efficiencyRank, String displayName, String description) {
        this.efficiencyRank = efficiencyRank;
        this.displayName = displayName;
        this.description = description;
    }

    public int getEfficiencyRank() {
        return efficiencyRank;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public boolean isModern() {
        return this.efficiencyRank >= H264.efficiencyRank;
    }

    public boolean isLegacy() {
        return this == DIVX || this == XVID;
    }

    public boolean isHEVC() {
        return this == H265 || this == X265;
    }
}
