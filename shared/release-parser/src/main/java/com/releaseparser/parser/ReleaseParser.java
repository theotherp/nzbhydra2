package com.releaseparser.parser;

import com.releaseparser.model.Codec;
import com.releaseparser.model.ReleaseInfo;
import com.releaseparser.model.Resolution;
import com.releaseparser.model.Source;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parses movie release titles and extracts quality information.
 * Based on parsing patterns from Radarr.
 */
public class ReleaseParser {

    // Source patterns (ordered for priority matching)
    private static final Pattern REMUX_PATTERN = Pattern.compile(
            "\\b(?<remux>(?:BD|UHD)?[-.]?Remux)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern SOURCE_PATTERN = Pattern.compile(
            "(?<bluray>M?Blu[-_. ]?Ray|HD[-_. ]?DVD|BD(?!$)|UHD2?BD|BDISO|BDMux|BD25|BD50|BR[-_. ]?DISK)|" +
            "(?<webdl>WEB[-_. ]?DL(?:mux)?|AmazonHD|AmazonSD|iTunesHD|MaxdomeHD|NetflixU?HD|WebHD|HBOMaxHD|DisneyHD|" +
                "[. ]WEB[. ](?:[xh][ .]?26[45]|AVC|HEVC|DDP?5[. ]1)|[. ](?-i:WEB)$|(?:\\d{3,4}0p)[-. ](?:Hybrid[-_. ]?)?WEB[-. ]|" +
            "[-. ]WEB[-. ]\\d{3,4}0p|\\b\\s/\\sWEB\\s/\\s\\b|(?:AMZN|NF|DP)[. -]WEB[. -](?!Rip)|" +
            "[. ]WEB[. -](?=[xh]26|AV1))|" +
            "(?<webrip>WebRip|Web-Rip|WEBMux)|" +
            "(?<hdtv>HDTV)|" +
            "(?<bdrip>BDRip|BDLight|HD[-_. ]?DVDRip|UHDBDRip)|" +
            "(?<brrip>BRRip)|" +
            "(?<scr>DVDSCR|DVDSCREENER|SCR|SCREENER)|" +
            "(?<dvd>DVDRip|xvidvd)|" +
            "(?<dvdr>\\d?x?M?DVD-?[R59]|DVD(?!SCR|SCREEN|Rip))|" +
            "(?<dsr>WS[-_. ]DSR|DSR)|" +
            "(?<ts>(?<![a-z])TS[-_. ]|TELESYNCH?|HD-TS|HDTS|PDVD|TSRip|HDTSRip)|" +
            "(?<tc>(?<![a-z])TC(?![a-z])|TELECINE|HD-TC|HDTC)|" +
            "(?<cam>CAMRIP|(?:NEW)?CAM|HD-?CAM(?:Rip)?|HQCAM)|" +
            "(?<wp>WORKPRINT|WP)|" +
            "(?<pdtv>PDTV)|" +
            "(?<sdtv>SDTV)|" +
            "(?<tvrip>TVRip)",
            Pattern.CASE_INSENSITIVE
    );

    // Resolution pattern
    private static final Pattern RESOLUTION_PATTERN = Pattern.compile(
            "\\b(?:" +
            "(?<R360p>360p)|" +
            "(?<R480p>480p|480i|640x480|848x480)|" +
            "(?<R540p>540p)|" +
            "(?<R576p>576p)|" +
            "(?<R720p>720p|1280x720|960p)|" +
            "(?<R1080p>1080p|1920x1080|1440p|FHD|1080i|4kto1080p)|" +
            "(?<R2160p>2160p|3840x2160|4k[-_. ]?(?:UHD|HEVC|BD|H\\.?265)?|(?:UHD|HEVC|BD|H\\.?265)[-_. ]4k|UHD)" +
            ")\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Codec patterns
    private static final Pattern CODEC_PATTERN = Pattern.compile(
            "\\b(?:" +
            "(?<x265>[xh][-_. ]?265|HEVC)|" +
            "(?<x264>[xh][-_. ]?264|AVC)|" +
            "(?<xvidhd>XvidHD)|" +
            "(?<xvid>X-?vid)|" +
            "(?<divx>divx)|" +
            "(?<av1>AV1)" +
            ")\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Hardcoded subs pattern
    private static final Pattern HARDCODED_SUBS_PATTERN = Pattern.compile(
            "\\b(?:" +
            "(?<hcsub>(?<lang>\\w+)?(?<!SOFT|MULTI|HORRIBLE)SUBS?)|" +
            "(?<hc>HC|SUBBED)" +
            ")\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Release group pattern
    private static final Pattern RELEASE_GROUP_PATTERN = Pattern.compile(
            "-(?<releasegroup>[a-z0-9]+(?:-[a-z0-9]+)?)(?:\\b|[-._ ]|$)",
            Pattern.CASE_INSENSITIVE
    );

    // Title patterns
    private static final Pattern TITLE_YEAR_PATTERN = Pattern.compile(
            "^(?<title>.+?)[._\\s-]+(?<year>(?:19|20)\\d{2})(?:[._\\s-]|$)",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern TITLE_ONLY_PATTERN = Pattern.compile(
            "^(?<title>.+?)(?:[._\\s-]+(?:480p|540p|576p|720p|1080p|2160p|4k|HDTV|WEB|BluRay|BDRip|DVDRip))",
            Pattern.CASE_INSENSITIVE
    );

    // Version patterns
    private static final Pattern VERSION_PATTERN = Pattern.compile(
            "\\bv(?<version>\\d)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern PROPER_PATTERN = Pattern.compile(
            "\\b(?<proper>PROPER)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern REPACK_PATTERN = Pattern.compile(
            "\\b(?<repack>REPACK|RERIP)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Edition patterns
    private static final Pattern EDITION_PATTERN = Pattern.compile(
            "\\b(?<edition>" +
            "(?:Director'?s?|Collector'?s?|Theatrical|Ultimate|Extended|Rogue|International|" +
            "Diamond|Anniversary|Criterion|Unrated|Uncut|Final|Remastered|Special|Limited|" +
            "IMAX|Cinema|Restored)[._\\s-]*(Cut|Edition|Version)?|" +
            "(?:Special|Extended|Unrated|Uncut)[._\\s-]*Edition|" +
            "(?:2|3|4|5)in1" +
            ")\\b",
            Pattern.CASE_INSENSITIVE
    );

    // HDR patterns
    private static final Pattern HDR_PATTERN = Pattern.compile(
            "\\b(?<hdr>HDR10(?:Plus|\\+)?|HDR|DV|DoVi|Dolby[-_. ]?Vision)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // 3D pattern
    private static final Pattern THREE_D_PATTERN = Pattern.compile(
            "\\b(?<threeD>3D|SBS|H[-_.]?SBS|H[-_.]?OU)\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Language patterns
    private static final Pattern LANGUAGE_PATTERN = Pattern.compile(
            "\\b(?:" +
            "(?<multi>MULTI)|" +
            "(?<english>ENGLISH|ENG)|" +
            "(?<french>FRENCH|TRUEFRENCH|VFF|VFQ|VFI|VF2|FRA?)|" +
            "(?<spanish>SPANISH|ESPANOL|ESP)|" +
            "(?<german>GERMAN|GER)|" +
            "(?<italian>ITALIAN|ITA)|" +
            "(?<dutch>DUTCH|FLEMISH|NL)|" +
            "(?<danish>DANISH|DAN)|" +
            "(?<finnish>FINNISH|FIN)|" +
            "(?<norwegian>NORWEGIAN|NOR)|" +
            "(?<swedish>SWEDISH|SWE)|" +
            "(?<russian>RUSSIAN|RUS)|" +
            "(?<polish>POLISH|POL|PL)|" +
            "(?<portuguese>PORTUGUESE|POR)|" +
            "(?<chinese>CHINESE|CHI|MANDARIN|CANTONESE)|" +
            "(?<japanese>JAPANESE|JPN?)|" +
            "(?<korean>KOREAN|KOR)|" +
            "(?<hindi>HINDI|HIN)|" +
            "(?<arabic>ARABIC|ARA)|" +
            "(?<hebrew>HEBREW|HEB)|" +
            "(?<greek>GREEK|GRE)|" +
            "(?<turkish>TURKISH|TUR)|" +
            "(?<thai>THAI|THA)" +
            ")\\b",
            Pattern.CASE_INSENSITIVE
    );

    // Website prefix/postfix cleanup
    private static final Pattern WEBSITE_PREFIX_PATTERN = Pattern.compile(
            "^\\[?(?:www\\.)?[-a-z0-9]+\\.(com|net|org|info|tv|cc|co|uk|ws)\\]?[-_. ]",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern TORRENT_SUFFIX_PATTERN = Pattern.compile(
            "\\[(?:ettv|rartv|rarbg|cttv|publichd|eztv|yify|yts)\\]$",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Parse a movie release title and extract all quality information.
     *
     * @param releaseTitle the release title to parse
     * @return ReleaseInfo containing parsed data
     */
    public ReleaseInfo parse(String releaseTitle) {
        if (releaseTitle == null || releaseTitle.isBlank()) {
            return new ReleaseInfo();
        }

        ReleaseInfo info = new ReleaseInfo();
        info.setOriginalTitle(releaseTitle);

        // Clean the title
        String cleanedTitle = cleanTitle(releaseTitle);

        // Parse all components
        parseSource(cleanedTitle, info);
        parseResolution(cleanedTitle, info);
        parseCodec(cleanedTitle, info);
        parseHardcodedSubs(cleanedTitle, info);
        parseReleaseGroup(cleanedTitle, info);
        parseVersionInfo(cleanedTitle, info);
        parseEdition(cleanedTitle, info);
        parseHDR(cleanedTitle, info);
        parse3D(cleanedTitle, info);
        parseLanguages(cleanedTitle, info);
        parseMovieTitle(cleanedTitle, info);

        return info;
    }

    private String cleanTitle(String title) {
        String cleaned = title;

        // Normalize underscores to dots for consistent parsing
        cleaned = cleaned.replace('_', '.');

        // Remove website prefixes
        cleaned = WEBSITE_PREFIX_PATTERN.matcher(cleaned).replaceFirst("");

        // Remove torrent suffixes
        cleaned = TORRENT_SUFFIX_PATTERN.matcher(cleaned).replaceFirst("");

        return cleaned.trim();
    }

    private void parseSource(String title, ReleaseInfo info) {
        // Check for remux first (highest quality indicator)
        Matcher remuxMatcher = REMUX_PATTERN.matcher(title);
        if (remuxMatcher.find()) {
            info.setRemux(true);
            info.setSource(Source.REMUX);
            return;
        }

        Matcher matcher = SOURCE_PATTERN.matcher(title);
        if (matcher.find()) {
            if (matcher.group("bluray") != null) {
                info.setSource(Source.BLURAY);
            } else if (matcher.group("webdl") != null) {
                info.setSource(Source.WEBDL);
            } else if (matcher.group("webrip") != null) {
                info.setSource(Source.WEBRIP);
            } else if (matcher.group("hdtv") != null) {
                info.setSource(Source.HDTV);
            } else if (matcher.group("bdrip") != null) {
                info.setSource(Source.BDRIP);
            } else if (matcher.group("brrip") != null) {
                info.setSource(Source.BRRIP);
            } else if (matcher.group("dvdr") != null) {
                info.setSource(Source.DVDR);
            } else if (matcher.group("dvd") != null) {
                info.setSource(Source.DVD);
            } else if (matcher.group("dsr") != null) {
                info.setSource(Source.DSR);
            } else if (matcher.group("scr") != null) {
                info.setSource(Source.SCREENER);
            } else if (matcher.group("ts") != null) {
                info.setSource(Source.TELESYNC);
            } else if (matcher.group("tc") != null) {
                info.setSource(Source.TELECINE);
            } else if (matcher.group("cam") != null) {
                info.setSource(Source.CAM);
            } else if (matcher.group("wp") != null) {
                info.setSource(Source.WORKPRINT);
            } else if (matcher.group("pdtv") != null) {
                info.setSource(Source.PDTV);
            } else if (matcher.group("sdtv") != null) {
                info.setSource(Source.SDTV);
            } else if (matcher.group("tvrip") != null) {
                info.setSource(Source.TVRIP);
            }
        }
    }

    private void parseResolution(String title, ReleaseInfo info) {
        Matcher matcher = RESOLUTION_PATTERN.matcher(title);
        if (matcher.find()) {
            if (matcher.group("R360p") != null) {
                info.setResolution(Resolution.R360P);
            } else if (matcher.group("R480p") != null) {
                info.setResolution(Resolution.R480P);
            } else if (matcher.group("R540p") != null) {
                info.setResolution(Resolution.R540P);
            } else if (matcher.group("R576p") != null) {
                info.setResolution(Resolution.R576P);
            } else if (matcher.group("R720p") != null) {
                info.setResolution(Resolution.R720P);
            } else if (matcher.group("R1080p") != null) {
                info.setResolution(Resolution.R1080P);
            } else if (matcher.group("R2160p") != null) {
                info.setResolution(Resolution.R2160P);
            }
        }
    }

    private void parseCodec(String title, ReleaseInfo info) {
        Matcher matcher = CODEC_PATTERN.matcher(title);
        if (matcher.find()) {
            if (matcher.group("x265") != null) {
                info.setCodec(Codec.X265);
            } else if (matcher.group("x264") != null) {
                info.setCodec(Codec.X264);
            } else if (matcher.group("xvidhd") != null || matcher.group("xvid") != null) {
                info.setCodec(Codec.XVID);
            } else if (matcher.group("divx") != null) {
                info.setCodec(Codec.DIVX);
            } else if (matcher.group("av1") != null) {
                info.setCodec(Codec.AV1);
            }
        }
    }

    private void parseHardcodedSubs(String title, ReleaseInfo info) {
        Matcher matcher = HARDCODED_SUBS_PATTERN.matcher(title);
        if (matcher.find()) {
            info.setHardcodedSubs(true);
            if (matcher.group("lang") != null) {
                info.setHardcodedSubsLanguage(matcher.group("lang"));
            }
        }
    }

    private void parseReleaseGroup(String title, ReleaseInfo info) {
        // Get the last match to avoid false positives from the title
        Matcher matcher = RELEASE_GROUP_PATTERN.matcher(title);
        String lastGroup = null;
        while (matcher.find()) {
            String group = matcher.group("releasegroup");
            // Filter out false positives (quality indicators, resolutions, etc.)
            if (!isQualityIndicator(group)) {
                lastGroup = group;
            }
        }
        if (lastGroup != null) {
            info.setReleaseGroup(lastGroup);
        }
    }

    private boolean isQualityIndicator(String group) {
        String upper = group.toUpperCase();
        return upper.matches("(?:480P|720P|1080P|2160P|HDTV|WEB|DL|RIP|DTS|HD|MA|X264|X265|HEVC|AVC|AAC|AC3|DD5|ATMOS|TRUEHD|FLAC)");
    }

    private void parseVersionInfo(String title, ReleaseInfo info) {
        Matcher versionMatcher = VERSION_PATTERN.matcher(title);
        if (versionMatcher.find()) {
            info.setVersion(Integer.parseInt(versionMatcher.group("version")));
        }

        if (PROPER_PATTERN.matcher(title).find()) {
            info.setProper(true);
        }

        if (REPACK_PATTERN.matcher(title).find()) {
            info.setRepack(true);
        }
    }

    private void parseEdition(String title, ReleaseInfo info) {
        Matcher matcher = EDITION_PATTERN.matcher(title);
        if (matcher.find()) {
            info.setEdition(matcher.group("edition").trim());
        }
    }

    private void parseHDR(String title, ReleaseInfo info) {
        Matcher matcher = HDR_PATTERN.matcher(title);
        if (matcher.find()) {
            String hdrType = matcher.group("hdr").toUpperCase();
            if (hdrType.contains("DV") || hdrType.contains("DOVI") || hdrType.contains("DOLBY")) {
                info.setDolbyVision(true);
            }
            info.setHdr(true);
        }
    }

    private void parse3D(String title, ReleaseInfo info) {
        if (THREE_D_PATTERN.matcher(title).find()) {
            info.setThreeDimensional(true);
        }
    }

    private void parseLanguages(String title, ReleaseInfo info) {
        Matcher matcher = LANGUAGE_PATTERN.matcher(title);
        while (matcher.find()) {
            if (matcher.group("multi") != null) info.addLanguage("Multi");
            if (matcher.group("english") != null) info.addLanguage("English");
            if (matcher.group("french") != null) info.addLanguage("French");
            if (matcher.group("spanish") != null) info.addLanguage("Spanish");
            if (matcher.group("german") != null) info.addLanguage("German");
            if (matcher.group("italian") != null) info.addLanguage("Italian");
            if (matcher.group("dutch") != null) info.addLanguage("Dutch");
            if (matcher.group("danish") != null) info.addLanguage("Danish");
            if (matcher.group("finnish") != null) info.addLanguage("Finnish");
            if (matcher.group("norwegian") != null) info.addLanguage("Norwegian");
            if (matcher.group("swedish") != null) info.addLanguage("Swedish");
            if (matcher.group("russian") != null) info.addLanguage("Russian");
            if (matcher.group("polish") != null) info.addLanguage("Polish");
            if (matcher.group("portuguese") != null) info.addLanguage("Portuguese");
            if (matcher.group("chinese") != null) info.addLanguage("Chinese");
            if (matcher.group("japanese") != null) info.addLanguage("Japanese");
            if (matcher.group("korean") != null) info.addLanguage("Korean");
            if (matcher.group("hindi") != null) info.addLanguage("Hindi");
            if (matcher.group("arabic") != null) info.addLanguage("Arabic");
            if (matcher.group("hebrew") != null) info.addLanguage("Hebrew");
            if (matcher.group("greek") != null) info.addLanguage("Greek");
            if (matcher.group("turkish") != null) info.addLanguage("Turkish");
            if (matcher.group("thai") != null) info.addLanguage("Thai");
        }
    }

    private void parseMovieTitle(String title, ReleaseInfo info) {
        // Try title with year first
        Matcher titleYearMatcher = TITLE_YEAR_PATTERN.matcher(title);
        if (titleYearMatcher.find()) {
            String movieTitle = titleYearMatcher.group("title");
            movieTitle = cleanMovieTitle(movieTitle);
            info.setMovieTitle(movieTitle);
            info.setYear(Integer.parseInt(titleYearMatcher.group("year")));
            return;
        }

        // Try title only (matched by quality indicators)
        Matcher titleOnlyMatcher = TITLE_ONLY_PATTERN.matcher(title);
        if (titleOnlyMatcher.find()) {
            String movieTitle = titleOnlyMatcher.group("title");
            movieTitle = cleanMovieTitle(movieTitle);
            info.setMovieTitle(movieTitle);
            return;
        }

        // Fallback: use everything before first quality indicator
        String[] parts = title.split("[._\\s-]+(?=(?:480p|540p|576p|720p|1080p|2160p|4k|HDTV|WEB|BluRay|BDRip|DVDRip|CAM|TS|TC|SCREENER))", 2);
        if (parts.length > 0) {
            info.setMovieTitle(cleanMovieTitle(parts[0]));
        }
    }

    private String cleanMovieTitle(String title) {
        // Replace separators with spaces
        String cleaned = title.replaceAll("[._]", " ");
        // Remove double spaces
        cleaned = cleaned.replaceAll("\\s+", " ");
        return cleaned.trim();
    }
}
