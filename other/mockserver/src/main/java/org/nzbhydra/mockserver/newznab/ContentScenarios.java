package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.builder.RssItemBuilder;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Scenarios that return a specific kind of content.
 */
public final class ContentScenarios {

    public static final String TV_QUERY = "tv";
    public static final String SLASH_QUERY = "slash";
    public static final String ONE_RESULT_QUERY = "oneresult";
    public static final String UI_TEST_QUERY = "uitest";
    public static final String NO_RESULTS_QUERY = "noresults";
    public static final String NO_RESULTS_TVDB_ID = "329089";
    public static final String MOVIES_QUERY_PART = "movies";
    public static final String LIMITS_NO_DOWNLOADS_QUERY = "limitsNoDownloads";
    public static final String LIMITS_QUERY = "limits";
    public static final String LIMITS_WITHOUT_DATES_QUERY = "limitswithoutdates";
    public static final String RANDOM_AGE_QUERY = "randomage";

    private static final List<String> MOVIE_TITLE_WORDS = List.of("cam", "ts", "blu-ray 2160p", "web-dl 1080p", "bluray 1080p", "3d bluray", "x265", "h265", "hevc", "xevc");

    private ContentScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(tv(), slash(), oneResult(), uiTest(), noResults(), movies(), limitsNoDownloads(), randomAge(), limits(), limitsWithoutDates());
    }

    public static Scenario tv() {
        return new Scenario("content-tv",
                "1000 episode results with show title, season and episode attributes",
                Match.query(TV_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(1000)
                                .titleBase(TV_QUERY)
                                .newznabCategory("5040")
                                .offset(0)
                                .total(15)
                                .build())
                        .mutateRoot((context, root) -> {
                            List<NewznabXmlItem> items = root.getRssChannel().getItems();
                            for (int i = 0; i < 1000; i++) {
                                NewznabXmlItem item = items.get(i);
                                item.setTitle("s0" + i + "e0" + i + "-" + context.random().nextInt());
                                item.getNewznabAttributes().add(new NewznabAttribute("showtitle", "showtitle"));
                                item.getNewznabAttributes().add(new NewznabAttribute("category", "5000"));
                                item.getNewznabAttributes().add(new NewznabAttribute("season", "S" + i));
                                item.getNewznabAttributes().add(new NewznabAttribute("episode", "E" + i));
                            }
                        }));
    }

    public static Scenario slash() {
        return new Scenario("content-slash",
                "A full page of results whose titles contain a slash",
                Match.query(SLASH_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                        .numberOfResults(IndexerPersona.API_MAX)
                        .titleBase("/")
                        .offset(context.offset())
                        .titleWords(Collections.emptyList())
                        .total(300)
                        .build()));
    }

    public static Scenario oneResult() {
        return new Scenario("content-oneresult",
                "Exactly one result",
                Match.query(ONE_RESULT_QUERY),
                Respond.generated(context -> NewznabMockRequest.builder()
                        .numberOfResults(1)
                        .titleBase(ONE_RESULT_QUERY)
                        .offset(context.offset())
                        .titleWords(Collections.emptyList())
                        .total(1)
                        .build()));
    }

    public static Scenario uiTest() {
        return new Scenario("content-uitest",
                "Stable, hand built results for the browser tests: three for the API key 1, two for any other",
                Match.query(UI_TEST_QUERY),
                Respond.items(context -> {
                    if ("1".equals(context.apikey())) {
                        NewznabXmlItem result1 = RssItemBuilder.builder("indexer1-result1").pubDate(Instant.now().minus(1, ChronoUnit.DAYS)).hasNfo(false).grabs(1).size(mbToBytes(1)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5000")))).category("TV").build();
                        NewznabXmlItem result2 = RssItemBuilder.builder("indexer1-result2").pubDate(Instant.now().minus(2, ChronoUnit.DAYS)).hasNfo(true).grabs(2).size(mbToBytes(2)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5040")))).category("TV SD").build();
                        NewznabXmlItem result3 = RssItemBuilder.builder("indexer1-result3").pubDate(Instant.now().minus(3, ChronoUnit.DAYS)).comments("http://localhost/commentsLink#comments").grabs(3).size(mbToBytes(3))
                                .newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "5030"), new NewznabAttribute("comments", "5"))))
                                .category("TV HD").build();
                        return Arrays.asList(result1, result2, result3);
                    }
                    NewznabXmlItem result4 = RssItemBuilder.builder("indexer2-result1").pubDate(Instant.now().minus(4, ChronoUnit.DAYS)).grabs(4).size(mbToBytes(4)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2000")))).category("Movies").build();
                    NewznabXmlItem result5 = RssItemBuilder.builder("indexer2-result2").pubDate(Instant.now().minus(5, ChronoUnit.DAYS)).grabs(5).size(mbToBytes(5)).newznabAttributes(new ArrayList<>(Arrays.asList(new NewznabAttribute("category", "2040")))).category("Movies HD").build();
                    return Arrays.asList(result4, result5);
                }));
    }

    private static long mbToBytes(int mb) {
        return mb * 1024L * 1024L;
    }

    public static Scenario noResults() {
        return new Scenario("content-noresults",
                "No results at all, either by query or by the TVDB id " + NO_RESULTS_TVDB_ID,
                Match.any(Match.query(NO_RESULTS_QUERY), Match.tvdbId(NO_RESULTS_TVDB_ID)),
                Respond.empty());
    }

    public static Scenario movies() {
        return new Scenario("content-movies",
                "A full page of movie results with quality words in their titles and a cover URL",
                Match.queryContains(MOVIES_QUERY_PART),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(IndexerPersona.API_MAX)
                                .titleBase(context.persona().titleBase())
                                .titleWords(MOVIE_TITLE_WORDS)
                                .offset(0)
                                .build())
                        .withTotal(IndexerPersona.API_MAX)
                        .mutateItems((context, item) -> {
                            item.getNewznabAttributes().clear();
                            item.getNewznabAttributes().add(new NewznabAttribute("coverurl", "https://artworks.thetvdb.com/banners/v4/movie/358180/posters/698143e3d4a3f.jpg"));
                            item.setCategory("Movies");
                            item.getNewznabAttributes().add(new NewznabAttribute("category", "2050"));
                        }));
    }

    public static Scenario limitsNoDownloads() {
        return new Scenario("content-limits-no-downloads",
                "Ten results with API limits that do not mention downloads",
                Match.query(LIMITS_NO_DOWNLOADS_QUERY),
                MetadataScenarios.avengers()
                        .withApiLimits(context -> new NewznabXmlApilimits(0, IndexerPersona.API_MAX, null, null)));
    }

    public static Scenario randomAge() {
        return new Scenario("content-randomage",
                "The persona's default results with randomized publication dates",
                Match.queryEqualsIgnoreCase(RANDOM_AGE_QUERY),
                PersonaDefaultScenario.behaviour()
                        .mutateItems((context, item) -> item.setPubDate(item.getPubDate().minus(context.random().nextInt(300) * 24L, ChronoUnit.HOURS))));
    }

    public static Scenario limits() {
        return new Scenario("content-limits",
                "The persona's default results with complete API limits",
                Match.query(LIMITS_QUERY),
                PersonaDefaultScenario.behaviour()
                        .withApiLimits(context -> new NewznabXmlApilimits(1, IndexerPersona.API_MAX, 2, 200, Instant.now().minus(10, ChronoUnit.HOURS), Instant.now().minus(10, ChronoUnit.HOURS))));
    }

    public static Scenario limitsWithoutDates() {
        return new Scenario("content-limits-without-dates",
                "The persona's default results with API limits that have no dates",
                Match.query(LIMITS_WITHOUT_DATES_QUERY),
                PersonaDefaultScenario.behaviour()
                        .withApiLimits(context -> new NewznabXmlApilimits(1, IndexerPersona.API_MAX, 2, 200, null, null)));
    }

}
