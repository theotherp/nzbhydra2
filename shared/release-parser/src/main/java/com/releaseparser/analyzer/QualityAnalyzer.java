package com.releaseparser.analyzer;

import com.releaseparser.model.Codec;
import com.releaseparser.model.ReleaseInfo;
import com.releaseparser.model.Resolution;
import com.releaseparser.model.Source;

import java.util.ArrayList;
import java.util.List;

/**
 * Analyzes release quality and provides warnings and comparisons.
 */
public class QualityAnalyzer {

    /**
     * Severity level for quality warnings.
     */
    public enum Severity {
        INFO,
        WARNING,
        CRITICAL
    }

    /**
     * A quality warning or information message.
     */
    public record QualityWarning(Severity severity, String message) {
        @Override
        public String toString() {
            return "[" + severity + "] " + message;
        }
    }

    /**
     * Result of comparing two releases.
     */
    public record ComparisonResult(
            ReleaseInfo better,
            ReleaseInfo worse,
            List<String> reasons
    ) {
        public boolean hasClearWinner() {
            return better != null && worse != null;
        }

        @Override
        public String toString() {
            if (!hasClearWinner()) {
                return "No clear winner - releases are similar quality";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("Better: ").append(better.getMovieTitle()).append("\n");
            sb.append("Reasons:\n");
            for (String reason : reasons) {
                sb.append("  - ").append(reason).append("\n");
            }
            return sb.toString();
        }
    }

    /**
     * Analyze a release and return any quality warnings.
     * Only returns warnings for issues not already covered by getRatingExplanation().
     *
     * @param info the release info to analyze
     * @return list of quality warnings
     */
    public List<QualityWarning> analyze(ReleaseInfo info) {
        List<QualityWarning> warnings = new ArrayList<>();

        // Only flag truly problematic issues not covered by the quality explanation

        // Unknown source is a real issue - we can't determine quality
        if (info.getSource() == Source.UNKNOWN) {
            warnings.add(new QualityWarning(Severity.WARNING,
                    "Unknown source - quality cannot be determined"));
        }

        // Hardcoded subs are a functional issue not covered in explanation
        if (info.isHardcodedSubs()) {
            String message = "Contains hardcoded subtitles that cannot be disabled";
            if (info.getHardcodedSubsLanguage() != null) {
                message += " (" + info.getHardcodedSubsLanguage() + ")";
            }
            warnings.add(new QualityWarning(Severity.WARNING, message));
        }

        // Screeners/workprints may have watermarks or missing content - unique info
        Source source = info.getSource();
        if (source == Source.SCREENER || source == Source.DVDSCR) {
            warnings.add(new QualityWarning(Severity.WARNING,
                    "May contain watermarks or other artifacts"));
        } else if (source == Source.WORKPRINT) {
            warnings.add(new QualityWarning(Severity.WARNING,
                    "Unfinished version - may have missing scenes or incomplete effects"));
        }

        return warnings;
    }

    /**
     * Compare two releases and determine which is better quality.
     *
     * @param release1 first release
     * @param release2 second release
     * @return comparison result
     */
    public ComparisonResult compare(ReleaseInfo release1, ReleaseInfo release2) {
        List<String> reasons = new ArrayList<>();
        int score1 = 0;
        int score2 = 0;

        // Compare source (most important)
        int sourceCompare = compareSource(release1, release2, reasons);
        score1 += sourceCompare > 0 ? 3 : 0;
        score2 += sourceCompare < 0 ? 3 : 0;

        // Compare resolution
        int resolutionCompare = compareResolution(release1, release2, reasons);
        score1 += resolutionCompare > 0 ? 2 : 0;
        score2 += resolutionCompare < 0 ? 2 : 0;

        // Compare codec
        int codecCompare = compareCodec(release1, release2, reasons);
        score1 += codecCompare > 0 ? 1 : 0;
        score2 += codecCompare < 0 ? 1 : 0;

        // Penalize hardcoded subs
        if (release1.isHardcodedSubs() && !release2.isHardcodedSubs()) {
            score2 += 1;
            reasons.add("Release 2 has no hardcoded subtitles");
        } else if (!release1.isHardcodedSubs() && release2.isHardcodedSubs()) {
            score1 += 1;
            reasons.add("Release 1 has no hardcoded subtitles");
        }

        // Prefer HDR
        if (release1.isHdr() && !release2.isHdr()) {
            score1 += 1;
            reasons.add("Release 1 has HDR");
        } else if (!release1.isHdr() && release2.isHdr()) {
            score2 += 1;
            reasons.add("Release 2 has HDR");
        }

        // Prefer PROPER/REPACK
        if ((release1.isProper() || release1.isRepack()) && !(release2.isProper() || release2.isRepack())) {
            score1 += 1;
            reasons.add("Release 1 is PROPER/REPACK");
        } else if (!(release1.isProper() || release1.isRepack()) && (release2.isProper() || release2.isRepack())) {
            score2 += 1;
            reasons.add("Release 2 is PROPER/REPACK");
        }

        if (score1 > score2) {
            return new ComparisonResult(release1, release2, reasons);
        } else if (score2 > score1) {
            return new ComparisonResult(release2, release1, reasons);
        } else {
            return new ComparisonResult(null, null, List.of("Releases are similar quality"));
        }
    }

    private int compareSource(ReleaseInfo r1, ReleaseInfo r2, List<String> reasons) {
        Source s1 = r1.getSource();
        Source s2 = r2.getSource();

        if (s1.isBetterThan(s2)) {
            reasons.add(s1.getDisplayName() + " source is better than " + s2.getDisplayName());
            return 1;
        } else if (s2.isBetterThan(s1)) {
            reasons.add(s2.getDisplayName() + " source is better than " + s1.getDisplayName());
            return -1;
        }
        return 0;
    }

    private int compareResolution(ReleaseInfo r1, ReleaseInfo r2, List<String> reasons) {
        Resolution res1 = r1.getResolution();
        Resolution res2 = r2.getResolution();

        if (res1.isBetterThan(res2)) {
            reasons.add(res1.getDisplayName() + " resolution is better than " + res2.getDisplayName());
            return 1;
        } else if (res2.isBetterThan(res1)) {
            reasons.add(res2.getDisplayName() + " resolution is better than " + res1.getDisplayName());
            return -1;
        }
        return 0;
    }

    private int compareCodec(ReleaseInfo r1, ReleaseInfo r2, List<String> reasons) {
        Codec c1 = r1.getCodec();
        Codec c2 = r2.getCodec();

        if (c1.getEfficiencyRank() > c2.getEfficiencyRank()) {
            reasons.add(c1.getDisplayName() + " codec is more efficient than " + c2.getDisplayName());
            return 1;
        } else if (c2.getEfficiencyRank() > c1.getEfficiencyRank()) {
            reasons.add(c2.getDisplayName() + " codec is more efficient than " + c1.getDisplayName());
            return -1;
        }
        return 0;
    }

    /**
     * Get a simple quality rating for a release (1-10 scale).
     *
     * @param info the release info
     * @return quality rating from 1 (worst) to 10 (best)
     */
    public int getQualityRating(ReleaseInfo info) {
        int rating = 5; // Base rating

        // Source contributes most (up to 4 points)
        rating += (info.getSource().getQualityRank() - 10) / 5;

        // Resolution (up to 2 points)
        if (info.getResolution().isUHD()) rating += 2;
        else if (info.getResolution().isFullHD()) rating += 1;
        else if (info.getResolution().isSD()) rating -= 1;

        // Codec (up to 1 point)
        if (info.getCodec().isHEVC() || info.getCodec() == Codec.AV1) rating += 1;
        else if (info.getCodec().isLegacy()) rating -= 1;

        // Penalties
        if (info.isHardcodedSubs()) rating -= 1;
        if (info.getSource().isPoorQuality()) rating -= 2;

        // Bonuses
        if (info.isHdr()) rating += 1;
        if (info.isRemux()) rating += 1;

        return Math.max(1, Math.min(10, rating));
    }

    /**
     * Get a text description of the quality level.
     *
     * @param rating the quality rating (1-10)
     * @return text description
     */
    public String getQualityDescription(int rating) {
        return switch (rating) {
            case 1, 2 -> "Very Poor - Avoid if possible";
            case 3, 4 -> "Poor - Low quality release";
            case 5, 6 -> "Average - Acceptable quality";
            case 7, 8 -> "Good - High quality release";
            case 9, 10 -> "Excellent - Premium quality release";
            default -> "Unknown";
        };
    }

    /**
     * Get an explanation of what contributes to the quality rating.
     * This helps users understand why a release has a certain rating.
     *
     * @param info the release info
     * @return list of explanations for the rating
     */
    public List<String> getRatingExplanation(ReleaseInfo info) {
        List<String> explanations = new ArrayList<>();

        // Source explanation
        Source source = info.getSource();
        if (source != Source.UNKNOWN) {
            String sourceDesc = switch (source) {
                case REMUX -> "Remux source (untouched disc quality)";
                case BLURAY -> "Blu-ray source (high quality)";
                case WEBDL -> "WEB-DL source (streaming quality)";
                case WEBRIP -> "WEBRip source (good streaming quality)";
                case HDTV -> "HDTV source (broadcast quality)";
                case BDRIP, BRRIP -> "Blu-ray rip (compressed from disc)";
                case DVD, DVDR -> "DVD source (standard definition)";
                case SCREENER, DVDSCR -> "Screener (pre-release copy)";
                case TELESYNC -> "Telesync (low quality)";
                case TELECINE -> "Telecine (low quality)";
                case CAM -> "CAM (very low quality)";
                default -> source.getDisplayName() + " source";
            };
            explanations.add(sourceDesc);
        }

        // Resolution explanation
        Resolution res = info.getResolution();
        if (res != Resolution.UNKNOWN) {
            String resDesc = res.getDisplayName();
            if (res.isUHD()) {
                resDesc += " (4K Ultra HD)";
            } else if (res.isFullHD()) {
                resDesc += " (Full HD)";
            } else if (res == Resolution.R720P) {
                resDesc += " (HD)";
            } else if (res.isSD()) {
                resDesc += " (Standard Definition)";
            }
            explanations.add(resDesc);
        }

        // Codec explanation
        Codec codec = info.getCodec();
        if (codec != Codec.UNKNOWN) {
            String codecDesc = codec.getDisplayName();
            if (codec.isHEVC() || codec == Codec.AV1) {
                codecDesc += " (modern efficient codec)";
            } else if (codec == Codec.X264) {
                codecDesc += " (widely compatible codec)";
            } else if (codec.isLegacy()) {
                codecDesc += " (legacy codec)";
            }
            explanations.add(codecDesc);
        }

        // HDR/DV
        if (info.isDolbyVision()) {
            explanations.add("Dolby Vision HDR");
        } else if (info.isHdr()) {
            explanations.add("HDR content");
        }

        // Special indicators
        if (info.isRemux()) {
            explanations.add("Remux (lossless quality)");
        }
        if (info.isProper()) {
            explanations.add("PROPER release");
        }
        if (info.isRepack()) {
            explanations.add("REPACK release");
        }
        if (info.getEdition() != null) {
            explanations.add(info.getEdition());
        }

        // Languages
        if (!info.getLanguages().isEmpty()) {
            explanations.add("Languages: " + String.join(", ", info.getLanguages()));
        }

        return explanations;
    }
}
