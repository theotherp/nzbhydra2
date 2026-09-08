package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.mock.NewznabMockRequest;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlApilimits;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.util.Collections;
import java.util.List;

/**
 * Searches by ID (rid, imdb, tmdb, tvdb).
 */
public final class MetadataScenarios {

    public static final String EMPTY_IMDB_ID = "0108052";
    public static final String MANY_RESULTS_TMDB_ID = "24";
    public static final String ERROR_APIKEY = "tmdberror";
    public static final String CAPS_CHECK_ERROR_APIKEY = "capscheckerror";

    private MetadataScenarios() {
    }

    public static List<Scenario> scenarios() {
        return List.of(ridWithoutQuery(), emptyImdbId(), manyResultsTmdbId(), tvSearchByImdbId(), tmdbError(), tmdbGeneric(), imdbGeneric());
    }

    public static Scenario ridWithoutQuery() {
        return new Scenario("metadata-rid-without-query",
                "A rid search without a query returns no results",
                Match.all(Match.hasRid(), Match.noQuery()),
                Respond.empty());
    }

    public static Scenario emptyImdbId() {
        return new Scenario("metadata-imdb-empty",
                "The IMDB id " + EMPTY_IMDB_ID + " returns no results",
                Match.imdbId(EMPTY_IMDB_ID),
                Respond.empty());
    }

    public static Scenario manyResultsTmdbId() {
        return new Scenario("metadata-tmdb-many-results",
                "The TMDB id " + MANY_RESULTS_TMDB_ID + " returns a full page and claims 10.000 results",
                Match.tmdbId(MANY_RESULTS_TMDB_ID),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(IndexerPersona.API_MAX)
                                .titleBase(context.persona().titleBase())
                                .titleWords(Collections.emptyList())
                                .offset(0)
                                .build())
                        .withTotal(10_000));
    }

    public static Scenario tvSearchByImdbId() {
        //The original set the title base twice, the second call ("game of thrones") won
        return new Scenario("metadata-tvsearch-imdb",
                "A TV search with an IMDB id returns 15 episodes with season and episode attributes",
                Match.all(Match.action(ActionAttribute.TVSEARCH), Match.hasImdbId()),
                Respond.generated(context -> NewznabMockRequest.builder()
                                .numberOfResults(15)
                                .titleBase("game of thrones")
                                .newznabCategory("5040")
                                .offset(0)
                                .total(15)
                                .build())
                        .mutateRoot((context, root) -> {
                            List<NewznabXmlItem> items = root.getRssChannel().getItems();
                            for (int i = 0; i < 15; i++) {
                                items.get(i).getNewznabAttributes().add(new NewznabAttribute("season", "1"));
                                items.get(i).getNewznabAttributes().add(new NewznabAttribute("episode", String.valueOf(i % 3)));
                            }
                        }));
    }

    public static Scenario tmdbError() {
        return new Scenario("metadata-tmdb-error",
                "TMDB searches against the error indexers answer with a newznab error",
                Match.all(Match.hasTmdbId(),
                        Match.any(Match.all(Match.apikey(ERROR_APIKEY), Match.not(Match.queryContains("groups"))),
                                Match.apikey(CAPS_CHECK_ERROR_APIKEY))),
                Respond.error("123", "description"));
    }

    public static Scenario tmdbGeneric() {
        return new Scenario("metadata-tmdb-generic",
                "Any other TMDB search returns ten avengers results, with API limits for indexers that report them",
                Match.hasTmdbId(),
                avengers().withApiLimits(context -> context.persona().reportsApiLimits()
                        ? new NewznabXmlApilimits(0, IndexerPersona.API_MAX, null, null)
                        : null));
    }

    public static Scenario imdbGeneric() {
        return new Scenario("metadata-imdb-generic",
                "Any other IMDB search returns ten avengers results, with API limits for indexers that report them",
                Match.hasImdbId(),
                avengers()
                        .withTotal(10)
                        .withApiLimits(context -> context.persona().reportsApiLimits()
                                ? new NewznabXmlApilimits(0, IndexerPersona.API_MAX, 0, 200)
                                : null));
    }

    static RootBehaviour avengers() {
        return Respond.generated(context -> NewznabMockRequest.builder()
                .numberOfResults(10)
                .titleBase("avengers")
                .generateDuplicates(context.generateDuplicates())
                .titleWords(Collections.emptyList())
                .offset(0)
                .build());
    }

}
