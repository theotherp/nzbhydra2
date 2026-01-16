package com.releaseparser;

import com.releaseparser.analyzer.QualityAnalyzer;
import com.releaseparser.model.ReleaseInfo;
import com.releaseparser.parser.ReleaseParser;

/**
 * Demo class showing how to use the release parser library.
 */
public class Demo {

    public static void main(String[] args) {
        ReleaseParser parser = new ReleaseParser();
        QualityAnalyzer analyzer = new QualityAnalyzer();

        // Example release titles
        String[] titles = {
            "Bomb.Guy.2023.IMAX.2160p.UHD.BluRay.Remux.DV.HDR.HEVC.TrueHD.Atmos.7.1-FGT",
            "The.Thingy.1999.1080p.BluRay.x264-SPARKS",
            "New.Movie.2024.HDCAM.HC.XviD-NOGRP",
            "Movie.Title.2023.1080p.WEB-DL.DDP5.1.H.264-GROUP",
            "Movie.2024.TS.x264-LOWQ"
        };

        System.out.println("=".repeat(80));
        System.out.println("RELEASE PARSER DEMO");
        System.out.println("=".repeat(80));

        for (String title : titles) {
            System.out.println("\n" + "-".repeat(80));
            System.out.println("Parsing: " + title);
            System.out.println("-".repeat(80));

            // Parse the release
            ReleaseInfo info = parser.parse(title);

            // Show parsed info
            System.out.println("\nParsed Info:");
            System.out.println("  Movie: " + info.getMovieTitle() + (info.getYear() != null ? " (" + info.getYear() + ")" : ""));
            System.out.println("  Source: " + info.getSource().getDisplayName() + " - " + info.getSource().getDescription());
            System.out.println("  Resolution: " + info.getResolution().getDisplayName());
            System.out.println("  Codec: " + info.getCodec().getDisplayName());
            if (info.getReleaseGroup() != null) {
                System.out.println("  Release Group: " + info.getReleaseGroup());
            }
            if (info.getEdition() != null) {
                System.out.println("  Edition: " + info.getEdition());
            }
            if (info.isHdr()) {
                System.out.println("  HDR: Yes" + (info.isDolbyVision() ? " (Dolby Vision)" : ""));
            }
            if (info.isRemux()) {
                System.out.println("  Remux: Yes");
            }

            // Get quality rating
            int rating = analyzer.getQualityRating(info);
            String description = analyzer.getQualityDescription(rating);
            System.out.println("\nQuality Rating: " + rating + "/10 - " + description);

            // Show warnings
            var warnings = analyzer.analyze(info);
            if (!warnings.isEmpty()) {
                System.out.println("\nWarnings:");
                for (var warning : warnings) {
                    System.out.println("  " + warning);
                }
            }
        }

        // Compare two releases
        System.out.println("\n" + "=".repeat(80));
        System.out.println("QUALITY COMPARISON");
        System.out.println("=".repeat(80));

        ReleaseInfo bluray = parser.parse("Movie.2024.1080p.BluRay.x264-GROUP1");
        ReleaseInfo cam = parser.parse("Movie.2024.CAM.x264-GROUP2");

        System.out.println("\nComparing:");
        System.out.println("  1. " + bluray.getOriginalTitle());
        System.out.println("  2. " + cam.getOriginalTitle());

        var comparison = analyzer.compare(bluray, cam);
        System.out.println("\nResult:");
        System.out.println(comparison);
    }
}
