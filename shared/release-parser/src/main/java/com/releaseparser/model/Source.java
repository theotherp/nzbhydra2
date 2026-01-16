package com.releaseparser.model;

/**
 * Video source types ordered by quality (lowest to highest).
 * Higher ordinal values indicate better quality.
 */
public enum Source {
    UNKNOWN(0, "Unknown", "Unknown source quality"),
    CAM(1, "CAM", "Camera recording from cinema - very poor quality"),
    TELESYNC(2, "Telesync", "Audio from direct source, video from CAM - poor quality"),
    TELECINE(3, "Telecine", "Copied from film reel - poor quality"),
    WORKPRINT(4, "Workprint", "Unfinished version leaked - poor quality"),
    SCREENER(5, "Screener", "Pre-release copy for reviewers - moderate quality"),
    DVDSCR(6, "DVD Screener", "DVD sent to reviewers - moderate quality"),
    SDTV(7, "SDTV", "Standard definition TV recording"),
    PDTV(8, "PDTV", "Pure Digital TV recording"),
    DSR(9, "DSR", "Digital satellite rip"),
    TVRIP(10, "TVRip", "Captured from TV broadcast"),
    DVD(11, "DVD", "Standard DVD rip"),
    DVDR(12, "DVD-R", "Full DVD backup"),
    HDTV(13, "HDTV", "High definition TV recording"),
    WEBDL(14, "WEB-DL", "Downloaded from streaming service - no re-encoding"),
    WEBRIP(15, "WEBRip", "Screen captured from streaming service"),
    BDRIP(16, "BDRip", "Encoded from Blu-ray source"),
    BRRIP(17, "BRRip", "Re-encoded from BDRip"),
    BLURAY(18, "Blu-ray", "Direct Blu-ray encode - high quality"),
    REMUX(19, "Remux", "Untouched video/audio from Blu-ray - highest quality");

    private final int qualityRank;
    private final String displayName;
    private final String description;

    Source(int qualityRank, String displayName, String description) {
        this.qualityRank = qualityRank;
        this.displayName = displayName;
        this.description = description;
    }

    public int getQualityRank() {
        return qualityRank;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public boolean isBetterThan(Source other) {
        return this.qualityRank > other.qualityRank;
    }

    public boolean isWorseThan(Source other) {
        return this.qualityRank < other.qualityRank;
    }

    public boolean isPoorQuality() {
        return this.qualityRank <= SCREENER.qualityRank;
    }

    public boolean isHighQuality() {
        return this.qualityRank >= BLURAY.qualityRank;
    }

    public boolean isStreamingSource() {
        return this == WEBDL || this == WEBRIP;
    }
}
