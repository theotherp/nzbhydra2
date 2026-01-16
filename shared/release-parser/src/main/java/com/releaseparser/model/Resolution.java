package com.releaseparser.model;

/**
 * Video resolution types ordered by quality (lowest to highest).
 */
public enum Resolution {
    UNKNOWN(0, "Unknown", 0, 0),
    R360P(1, "360p", 640, 360),
    R480P(2, "480p", 854, 480),
    R540P(3, "540p", 960, 540),
    R576P(4, "576p", 1024, 576),
    R720P(5, "720p", 1280, 720),
    R1080P(6, "1080p", 1920, 1080),
    R2160P(7, "2160p", 3840, 2160);

    private final int qualityRank;
    private final String displayName;
    private final int width;
    private final int height;

    Resolution(int qualityRank, String displayName, int width, int height) {
        this.qualityRank = qualityRank;
        this.displayName = displayName;
        this.width = width;
        this.height = height;
    }

    public int getQualityRank() {
        return qualityRank;
    }

    public String getDisplayName() {
        return displayName;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public boolean isBetterThan(Resolution other) {
        return this.qualityRank > other.qualityRank;
    }

    public boolean isWorseThan(Resolution other) {
        return this.qualityRank < other.qualityRank;
    }

    public boolean isHD() {
        return this.qualityRank >= R720P.qualityRank;
    }

    public boolean isFullHD() {
        return this.qualityRank >= R1080P.qualityRank;
    }

    public boolean isUHD() {
        return this == R2160P;
    }

    public boolean isSD() {
        return this.qualityRank > 0 && this.qualityRank < R720P.qualityRank;
    }
}
