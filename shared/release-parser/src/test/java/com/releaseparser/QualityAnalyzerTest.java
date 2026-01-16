package com.releaseparser;

import com.releaseparser.analyzer.QualityAnalyzer;
import com.releaseparser.analyzer.QualityAnalyzer.QualityWarning;
import com.releaseparser.analyzer.QualityAnalyzer.Severity;
import com.releaseparser.model.ReleaseInfo;
import com.releaseparser.parser.ReleaseParser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class QualityAnalyzerTest {

    private QualityAnalyzer analyzer;
    private ReleaseParser parser;

    @BeforeEach
    void setUp() {
        analyzer = new QualityAnalyzer();
        parser = new ReleaseParser();
    }

    @Nested
    class WarningGeneration {

        @Test
        void shouldWarnAboutUnknownSource() {
            ReleaseInfo info = parser.parse("Movie.2024.x264-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            assertThat(warnings)
                    .anyMatch(w -> w.severity() == Severity.WARNING && w.message().toLowerCase().contains("unknown source"));
        }

        @Test
        void shouldWarnAboutScreenerWatermarks() {
            ReleaseInfo info = parser.parse("Movie.2024.DVDSCR.x264-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            assertThat(warnings)
                    .anyMatch(w -> w.severity() == Severity.WARNING && w.message().toLowerCase().contains("watermarks"));
        }

        @Test
        void shouldWarnAboutScreener() {
            ReleaseInfo info = parser.parse("Movie.2024.SCREENER.x264-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            assertThat(warnings)
                    .anyMatch(w -> w.severity() == Severity.WARNING && w.message().toLowerCase().contains("watermarks"));
        }

        @Test
        void shouldWarnAboutWorkprint() {
            ReleaseInfo info = parser.parse("Movie.2024.WORKPRINT.x264-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            assertThat(warnings)
                    .anyMatch(w -> w.severity() == Severity.WARNING && w.message().toLowerCase().contains("unfinished"));
        }

        @Test
        void shouldWarnAboutHardcodedSubs() {
            ReleaseInfo info = parser.parse("Movie.2024.1080p.BluRay.HC.x264-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            assertThat(warnings)
                    .anyMatch(w -> w.severity() == Severity.WARNING && w.message().toLowerCase().contains("hardcoded"));
        }

        @Test
        void shouldNotWarnAboutHighQualityRelease() {
            // High quality releases should have no warnings (quality info is in getRatingExplanation)
            ReleaseInfo info = parser.parse("Movie.2024.2160p.UHD.BluRay.Remux.HDR.HEVC-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            assertThat(warnings).isEmpty();
        }

        @Test
        void shouldNotWarnAboutCAMInAnalyze() {
            // CAM quality is explained in getRatingExplanation, not as a warning
            ReleaseInfo info = parser.parse("Movie.2024.CAM.x264-GROUP");
            List<QualityWarning> warnings = analyzer.analyze(info);

            // Should have no warnings (CAM source is in quality explanation)
            assertThat(warnings).isEmpty();
        }
    }

    @Nested
    class QualityComparison {

        @Test
        void shouldPreferBlurayOverWebDL() {
            ReleaseInfo bluray = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");
            ReleaseInfo webdl = parser.parse("Movie.2024.1080p.WEB-DL.x264-GROUP");

            var result = analyzer.compare(bluray, webdl);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(bluray);
        }

        @Test
        void shouldPreferWebDLOverCAM() {
            ReleaseInfo webdl = parser.parse("Movie.2024.1080p.WEB-DL.x264-GROUP");
            ReleaseInfo cam = parser.parse("Movie.2024.CAM.x264-GROUP");

            var result = analyzer.compare(webdl, cam);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(webdl);
        }

        @Test
        void shouldPreferRemuxOverBluray() {
            ReleaseInfo remux = parser.parse("Movie.2024.1080p.BluRay.Remux.AVC-GROUP");
            ReleaseInfo bluray = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");

            var result = analyzer.compare(remux, bluray);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(remux);
        }

        @Test
        void shouldPrefer2160pOver1080p() {
            ReleaseInfo uhd = parser.parse("Movie.2024.2160p.BluRay.x265-GROUP");
            ReleaseInfo fhd = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");

            var result = analyzer.compare(uhd, fhd);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(uhd);
        }

        @Test
        void shouldPreferReleaseWithoutHardcodedSubs() {
            ReleaseInfo withSubs = parser.parse("Movie.2024.1080p.BluRay.HC.x264-GROUP");
            ReleaseInfo withoutSubs = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");

            var result = analyzer.compare(withSubs, withoutSubs);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(withoutSubs);
        }

        @Test
        void shouldPreferHDRRelease() {
            ReleaseInfo hdr = parser.parse("Movie.2024.2160p.BluRay.HDR.x265-GROUP");
            ReleaseInfo sdr = parser.parse("Movie.2024.2160p.BluRay.x265-GROUP");

            var result = analyzer.compare(hdr, sdr);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(hdr);
        }

        @Test
        void shouldPreferProperRelease() {
            ReleaseInfo proper = parser.parse("Movie.2024.1080p.BluRay.PROPER.x264-GROUP");
            ReleaseInfo normal = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");

            var result = analyzer.compare(proper, normal);

            assertThat(result.hasClearWinner()).isTrue();
            assertThat(result.better()).isEqualTo(proper);
        }
    }

    @Nested
    class QualityRating {

        @Test
        void shouldRateRemux4KHighest() {
            ReleaseInfo info = parser.parse("Movie.2024.2160p.UHD.BluRay.Remux.HDR.HEVC-GROUP");
            int rating = analyzer.getQualityRating(info);

            assertThat(rating).isGreaterThanOrEqualTo(9);
        }

        @Test
        void shouldRateBluray1080pWell() {
            ReleaseInfo info = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");
            int rating = analyzer.getQualityRating(info);

            assertThat(rating).isBetween(6, 8);
        }

        @Test
        void shouldRateCAMPoorly() {
            ReleaseInfo info = parser.parse("Movie.2024.CAM.x264-GROUP");
            int rating = analyzer.getQualityRating(info);

            assertThat(rating).isLessThanOrEqualTo(3);
        }

        @Test
        void shouldRateTelesyncPoorly() {
            ReleaseInfo info = parser.parse("Movie.2024.TS.x264-GROUP");
            int rating = analyzer.getQualityRating(info);

            assertThat(rating).isLessThanOrEqualTo(3);
        }

        @Test
        void shouldPenalizeHardcodedSubs() {
            ReleaseInfo withSubs = parser.parse("Movie.2024.1080p.BluRay.HC.x264-GROUP");
            ReleaseInfo withoutSubs = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");

            int ratingWithSubs = analyzer.getQualityRating(withSubs);
            int ratingWithoutSubs = analyzer.getQualityRating(withoutSubs);

            assertThat(ratingWithSubs).isLessThan(ratingWithoutSubs);
        }
    }

    @Nested
    class QualityDescription {

        @Test
        void shouldDescribeExcellentQuality() {
            assertThat(analyzer.getQualityDescription(10)).containsIgnoringCase("excellent");
            assertThat(analyzer.getQualityDescription(9)).containsIgnoringCase("excellent");
        }

        @Test
        void shouldDescribeGoodQuality() {
            assertThat(analyzer.getQualityDescription(8)).containsIgnoringCase("good");
            assertThat(analyzer.getQualityDescription(7)).containsIgnoringCase("good");
        }

        @Test
        void shouldDescribeAverageQuality() {
            assertThat(analyzer.getQualityDescription(6)).containsIgnoringCase("average");
            assertThat(analyzer.getQualityDescription(5)).containsIgnoringCase("average");
        }

        @Test
        void shouldDescribePoorQuality() {
            assertThat(analyzer.getQualityDescription(4)).containsIgnoringCase("poor");
            assertThat(analyzer.getQualityDescription(3)).containsIgnoringCase("poor");
        }

        @Test
        void shouldDescribeVeryPoorQuality() {
            assertThat(analyzer.getQualityDescription(2)).containsIgnoringCase("very poor");
            assertThat(analyzer.getQualityDescription(1)).containsIgnoringCase("very poor");
        }
    }

    @Nested
    class RealWorldScenarios {

        @Test
        void shouldCorrectlyAnalyzePremiumRelease() {
            ReleaseInfo info = parser.parse("Oppenheimer.2023.IMAX.2160p.UHD.BluRay.Remux.DV.HDR.HEVC-FGT");
            List<QualityWarning> warnings = analyzer.analyze(info);
            int rating = analyzer.getQualityRating(info);

            // Premium releases should have no warnings (quality info is in getRatingExplanation)
            assertThat(warnings).isEmpty();

            // Should have high rating
            assertThat(rating).isGreaterThanOrEqualTo(9);

            // Quality explanation should contain the relevant info
            List<String> explanation = analyzer.getRatingExplanation(info);
            assertThat(explanation)
                    .anyMatch(e -> e.toLowerCase().contains("remux"));
            assertThat(explanation)
                    .anyMatch(e -> e.contains("HDR") || e.contains("Dolby Vision"));
        }

        @Test
        void shouldCorrectlyWarnAboutPoorRelease() {
            ReleaseInfo info = parser.parse("New.Movie.2024.HDCAM.HC.XviD-NOGRP");
            List<QualityWarning> warnings = analyzer.analyze(info);
            int rating = analyzer.getQualityRating(info);

            // Should have warning about hardcoded subs (only unique warnings are in analyze())
            assertThat(warnings)
                    .anyMatch(w -> w.message().toLowerCase().contains("hardcoded"));

            // Should have low rating
            assertThat(rating).isLessThanOrEqualTo(3);

            // Quality explanation should contain source info
            List<String> explanation = analyzer.getRatingExplanation(info);
            assertThat(explanation)
                    .anyMatch(e -> e.toLowerCase().contains("cam"));
        }

        @Test
        void shouldCompareTypicalReleases() {
            ReleaseInfo premium = parser.parse("Movie.2024.2160p.UHD.BluRay.Remux.HDR.HEVC-GROUP1");
            ReleaseInfo standard = parser.parse("Movie.2024.1080p.WEB-DL.x264-GROUP2");
            ReleaseInfo poor = parser.parse("Movie.2024.CAM.x264-GROUP3");

            // Premium should beat standard
            var result1 = analyzer.compare(premium, standard);
            assertThat(result1.better()).isEqualTo(premium);

            // Standard should beat poor
            var result2 = analyzer.compare(standard, poor);
            assertThat(result2.better()).isEqualTo(standard);

            // Premium should beat poor
            var result3 = analyzer.compare(premium, poor);
            assertThat(result3.better()).isEqualTo(premium);
        }
    }

    @Nested
    class RatingExplanation {

        @Test
        void shouldExplainSourceQuality() {
            ReleaseInfo info = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP");
            List<String> explanation = analyzer.getRatingExplanation(info);

            assertThat(explanation)
                    .anyMatch(e -> e.toLowerCase().contains("blu-ray"));
        }

        @Test
        void shouldExplainResolution() {
            ReleaseInfo info = parser.parse("Movie.2024.2160p.BluRay.x265-GROUP");
            List<String> explanation = analyzer.getRatingExplanation(info);

            assertThat(explanation)
                    .anyMatch(e -> e.contains("2160p") || e.contains("4K"));
        }

        @Test
        void shouldExplainCodec() {
            ReleaseInfo info = parser.parse("Movie.2024.1080p.BluRay.x265-GROUP");
            List<String> explanation = analyzer.getRatingExplanation(info);

            assertThat(explanation)
                    .anyMatch(e -> e.toLowerCase().contains("x265") || e.toLowerCase().contains("hevc"));
        }

        @Test
        void shouldExplainHDR() {
            ReleaseInfo info = parser.parse("Movie.2024.2160p.BluRay.HDR.x265-GROUP");
            List<String> explanation = analyzer.getRatingExplanation(info);

            assertThat(explanation)
                    .anyMatch(e -> e.contains("HDR"));
        }

        @Test
        void shouldExplainRemux() {
            ReleaseInfo info = parser.parse("Movie.2024.1080p.BluRay.Remux.AVC-GROUP");
            List<String> explanation = analyzer.getRatingExplanation(info);

            assertThat(explanation)
                    .anyMatch(e -> e.toLowerCase().contains("remux"));
        }

        @Test
        void shouldExplainProper() {
            ReleaseInfo info = parser.parse("Movie.2024.1080p.BluRay.PROPER.x264-GROUP");
            List<String> explanation = analyzer.getRatingExplanation(info);

            assertThat(explanation)
                    .anyMatch(e -> e.contains("PROPER"));
        }
    }
}
