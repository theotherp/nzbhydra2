package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.mock.NewznabMockBuilder;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * Byte stable fixtures the system tests assert on. They must stay free of randomness.
 */
public final class DeterministicFixtures {

    public static final String DETERMINISTIC_TORRENT_FILE_QUERY = "torrent-system-file";
    public static final String DETERMINISTIC_MAGNET_QUERY = "torrent-system-magnet";
    public static final String DETERMINISTIC_TORRENT_TITLE = "Hydra Deterministic Torrent File";
    public static final String DETERMINISTIC_MAGNET_TITLE = "Hydra Deterministic Magnet Link";
    public static final String DETERMINISTIC_TORRENT_CONTENT = "d4:infod4:name31:Hydra Deterministic Torrent Fileee";
    public static final String DETERMINISTIC_MAGNET_URI = "magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567&dn=Hydra Deterministic Magnet Link";
    public static final String DETERMINISTIC_DOWNLOADER_QUERY = "downloader-integration-nzb";
    public static final String DETERMINISTIC_DOWNLOADER_TITLE = "Hydra Downloader Integration NZB";
    public static final String DETERMINISTIC_DOWNLOADER_CONTENT = "Would download NZB with IDdownloader-integration-1";
    public static final String DETERMINISTIC_MOVIE_TMDB_ID = "424242";
    public static final String DETERMINISTIC_MOVIE_TITLE = "Hydra Downloader Integration Movie";
    public static final String DETERMINISTIC_NZBGET_QUERY_PREFIX = "nzbget-integration-";
    public static final String DETERMINISTIC_NZBGET_TITLE = "Hydra NZBGet Integration NZB";
    public static final String DETERMINISTIC_NZBGET_CONTENT = "Would download NZB with IDnzbget-integration-1";

    private DeterministicFixtures() {
    }

    public static List<Scenario> scenarios() {
        return List.of(downloaderNzb(), nzbGetNzb(), movie());
    }

    public static Scenario downloaderNzb() {
        return new Scenario("deterministic-downloader-nzb",
                "Single stable NZB result used by the downloader integration system test",
                Match.query(DETERMINISTIC_DOWNLOADER_QUERY),
                Respond.items(context -> Collections.singletonList(NewznabMockBuilder.buildItem(1, DETERMINISTIC_DOWNLOADER_TITLE, Instant.EPOCH, "12345", "poster", "group", "2040", "downloader-integration-", false, "deterministic downloader result"))));
    }

    public static Scenario nzbGetNzb() {
        return new Scenario("deterministic-nzbget-nzb",
                "Single stable NZB result used by the NZBGet integration system test",
                Match.queryStartsWith(DETERMINISTIC_NZBGET_QUERY_PREFIX),
                Respond.items(context -> Collections.singletonList(NewznabMockBuilder.buildItem(1, DETERMINISTIC_NZBGET_TITLE, Instant.EPOCH, "12345", "poster", "group", "2040", "nzbget-integration-", false, "deterministic NZBGet result"))));
    }

    public static Scenario movie() {
        return new Scenario("deterministic-movie-tmdb",
                "Single stable movie result for the TMDB id the system tests search for",
                Match.tmdbId(DETERMINISTIC_MOVIE_TMDB_ID),
                Respond.items(context -> Collections.singletonList(NewznabMockBuilder.buildItem(1, DETERMINISTIC_MOVIE_TITLE, Instant.EPOCH, "12345", "poster", "group", "2000", "downloader-movie-", false, "deterministic movie result"))));
    }

}
