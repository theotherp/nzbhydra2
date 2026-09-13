package org.nzbhydra.mockserver.newznab;

import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

/**
 * An ordered list of scenarios; the first matching one answers the request.
 */
public class ScenarioRegistry {

    private final String endpoint;
    private final List<Scenario> scenarios;

    public ScenarioRegistry(String endpoint, List<Scenario> scenarios) {
        this.endpoint = endpoint;
        this.scenarios = List.copyOf(scenarios);
    }

    public String endpoint() {
        return endpoint;
    }

    public List<Scenario> all() {
        return scenarios;
    }

    /**
     * The scenario that answers the request, ignoring the delays that may apply on the way there.
     */
    public Optional<Scenario> resolve(NewznabParameters parameters) {
        return scenarios.stream()
                .filter(Scenario::isTerminating)
                .filter(scenario -> scenario.matches(parameters))
                .findFirst();
    }

    /**
     * The scenario that answers the request together with every delay scenario that matched before it. Delays that sit
     * behind the answering scenario in the list do not apply, exactly like in the original if chain.
     */
    public Resolution resolveWithDelays(MockContext context) {
        List<Scenario> delays = new ArrayList<>();
        for (Scenario scenario : scenarios) {
            if (!scenario.matches(context.params())) {
                continue;
            }
            if (scenario.isTerminating()) {
                return new Resolution(delays, Optional.of(scenario));
            }
            delays.add(scenario);
        }
        return new Resolution(delays, Optional.empty());
    }

    public record Resolution(List<Scenario> delays, Optional<Scenario> scenario) {

        public boolean isResolvedTo(String scenarioId) {
            return scenario.map(candidate -> candidate.id().equals(scenarioId)).orElse(false);
        }

        /**
         * Runs the delays that matched on the way and then the answering scenario.
         */
        public ResponseEntity<?> respond(MockContext context, Consumer<Scenario> onScenario) throws Exception {
            for (Scenario delay : delays) {
                onScenario.accept(delay);
                delay.behaviour().respond(context);
            }
            Scenario answering = scenario.orElseThrow(() -> new IllegalStateException("No scenario matched " + context.params()));
            onScenario.accept(answering);
            return answering.behaviour().respond(context);
        }
    }

    /**
     * The newznab registry, in the precedence order of the original if chain in {@code MockNewznab#api}:
     *
     * <ol>
     *     <li>protocol-too-many-requests</li>
     *     <li><em>caps (answered by the controller)</em></li>
     *     <li>protocol-forbidden</li>
     *     <li><em>getnfo (answered by the controller)</em></li>
     *     <li>resilience-timeout (delay only)</li>
     *     <li>resilience-malformed-xml</li>
     *     <li>deterministic-downloader-nzb</li>
     *     <li>deterministic-nzbget-nzb</li>
     *     <li>deterministic-movie-tmdb (before every generic TMDB scenario)</li>
     *     <li>metadata-rid-without-query</li>
     *     <li>metadata-imdb-empty</li>
     *     <li>metadata-tmdb-many-results</li>
     *     <li>duplicates-samenames</li>
     *     <li>duplicates-titleduplicates</li>
     *     <li>paging-offsettest</li>
     *     <li>paging-offsettest2</li>
     *     <li>metadata-tvsearch-imdb</li>
     *     <li>content-tv</li>
     *     <li>failure-invalid-xml</li>
     *     <li>content-slash</li>
     *     <li>duplicates-actualduplicates</li>
     *     <li>content-oneresult</li>
     *     <li>content-uitest</li>
     *     <li>paging-dognzbtotaltest</li>
     *     <li>content-noresults</li>
     *     <li>failure-sleep, failure-sleep10, failure-sleep20, failure-sleeplong1, failure-sleeplong (delays only,
     *     applied in this order and cumulatively, then the request falls through to the scenarios below)</li>
     *     <li>content-movies (before the duplicate and generic ID scenarios)</li>
     *     <li>duplicates-oneduplicate</li>
     *     <li>duplicates-titlegroup</li>
     *     <li>metadata-tmdb-error</li>
     *     <li>metadata-tmdb-generic</li>
     *     <li>content-limits-no-downloads</li>
     *     <li>failure-error</li>
     *     <li>metadata-imdb-generic</li>
     *     <li>paging-show</li>
     *     <li>paging-blub</li>
     *     <li>paging-plain, paging-with-total, content-randomage, content-limits, content-limits-without-dates (all of
     *     these were decorations of the tail block and cannot match the same request)</li>
     *     <li>persona-default</li>
     * </ol>
     */
    public static ScenarioRegistry newznab() {
        List<Scenario> scenarios = new ArrayList<>();
        scenarios.add(ProtocolScenarios.tooManyRequests());
        scenarios.add(ProtocolScenarios.forbidden());
        scenarios.add(ResilienceScenarios.timeout());
        scenarios.add(ResilienceScenarios.malformedXml());
        scenarios.add(DeterministicFixtures.downloaderNzb());
        scenarios.add(DeterministicFixtures.nzbGetNzb());
        scenarios.add(DeterministicFixtures.movie());
        scenarios.add(MetadataScenarios.ridWithoutQuery());
        scenarios.add(MetadataScenarios.emptyImdbId());
        scenarios.add(MetadataScenarios.manyResultsTmdbId());
        scenarios.add(DuplicateScenarios.sameNames());
        scenarios.add(DuplicateScenarios.titleDuplicates());
        scenarios.add(PagingScenarios.offsetTest());
        scenarios.add(PagingScenarios.offsetTest2());
        scenarios.add(MetadataScenarios.tvSearchByImdbId());
        scenarios.add(ContentScenarios.tv());
        scenarios.add(FailureScenarios.invalidXml());
        scenarios.add(ContentScenarios.slash());
        scenarios.add(DuplicateScenarios.actualDuplicates());
        scenarios.add(ContentScenarios.oneResult());
        scenarios.add(ContentScenarios.uiTest());
        scenarios.add(PagingScenarios.dognzbTotalTest());
        scenarios.add(ContentScenarios.noResults());
        scenarios.add(FailureScenarios.sleepRandom());
        scenarios.add(FailureScenarios.sleepTenSeconds());
        scenarios.add(FailureScenarios.sleepTwentySeconds());
        scenarios.add(FailureScenarios.sleepLongForIndexerOne());
        scenarios.add(FailureScenarios.sleepLong());
        scenarios.add(ContentScenarios.movies());
        scenarios.add(DuplicateScenarios.oneDuplicate());
        scenarios.add(DuplicateScenarios.titleGroup());
        scenarios.add(MetadataScenarios.tmdbError());
        scenarios.add(MetadataScenarios.tmdbGeneric());
        scenarios.add(ContentScenarios.limitsNoDownloads());
        scenarios.add(FailureScenarios.error());
        scenarios.add(MetadataScenarios.imdbGeneric());
        scenarios.add(PagingScenarios.show());
        scenarios.add(PagingScenarios.blub());
        scenarios.add(PagingScenarios.paging());
        scenarios.add(PagingScenarios.pagingWithTotal());
        scenarios.add(ContentScenarios.randomAge());
        scenarios.add(ContentScenarios.limits());
        scenarios.add(ContentScenarios.limitsWithoutDates());
        scenarios.add(PersonaDefaultScenario.personaDefault());
        return new ScenarioRegistry("newznab", scenarios);
    }

    /**
     * The torznab registry: the two deterministic fixtures first, then the generic torznab response. Caps requests are
     * answered by the controller before the registry is consulted.
     */
    public static ScenarioRegistry torznab() {
        return new ScenarioRegistry("torznab", TorznabScenarios.scenarios());
    }

}
