package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class ContentScenariosTest {

    @Test
    void shouldReturnEpisodesWithSeasonAndEpisodeAttributes() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", ContentScenarios.TV_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("content-tv");
        assertThat(answer.items()).hasSize(1000);
        assertThat(answer.items().get(0).getTitle()).startsWith("s00e00-");
        assertThat(names(answer.items().get(0))).contains("showtitle", "season", "episode");
        //Was misspelled as "ctageory" before
        assertThat(attributes(answer.items().get(0), "category")).contains("5000");
    }

    @Test
    void shouldReturnResultsWithSlashesInTheirTitles() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", ContentScenarios.SLASH_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("content-slash");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexer/-1");
    }

    @Test
    void shouldReturnExactlyOneResult() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", ContentScenarios.ONE_RESULT_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("content-oneresult");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.total()).isEqualTo(1);
    }

    @Test
    void shouldReturnStableResultsForTheBrowserTests() throws Exception {
        ScenarioTestSupport.Answer first = answer("1", ContentScenarios.UI_TEST_QUERY);

        assertThat(first.scenarioId()).isEqualTo("content-uitest");
        assertThat(first.items()).extracting(NewznabXmlItem::getTitle).containsExactly("indexer1-result1", "indexer1-result2", "indexer1-result3");
        assertThat(first.total()).isEqualTo(3);

        ScenarioTestSupport.Answer second = answer("2", ContentScenarios.UI_TEST_QUERY);
        assertThat(second.items()).extracting(NewznabXmlItem::getTitle).containsExactly("indexer2-result1", "indexer2-result2");
        assertThat(second.total()).isEqualTo(2);
    }

    @Test
    void shouldReturnNoResults() throws Exception {
        assertThat(answer("1", ContentScenarios.NO_RESULTS_QUERY).items()).isEmpty();

        NewznabParameters parameters = params("1", null);
        parameters.setTvdbid(ContentScenarios.NO_RESULTS_TVDB_ID);
        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("content-noresults");
        assertThat(answer.items()).isEmpty();
    }

    @Test
    void shouldReturnMovieResultsWithCoverUrls() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", "some movies");

        assertThat(answer.scenarioId()).isEqualTo("content-movies");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(IndexerPersona.API_MAX);
        assertThat(answer.items().get(0).getCategory()).isEqualTo("Movies");
        assertThat(names(answer.items().get(0))).containsExactly("coverurl", "category");
        assertThat(attributes(answer.items().get(0), "category")).containsExactly("2050");
    }

    @Test
    void shouldReturnApiLimitsWithoutDownloads() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", ContentScenarios.LIMITS_NO_DOWNLOADS_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("content-limits-no-downloads");
        assertThat(answer.items()).hasSize(10);
        assertThat(answer.apiLimits().getApiMax()).isEqualTo(IndexerPersona.API_MAX);
        assertThat(answer.apiLimits().getGrabMax()).isNull();
    }

    @Test
    void shouldReturnTheDefaultResultsWithRandomAges() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", ContentScenarios.RANDOM_AGE_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("content-randomage");
        assertThat(answer.items()).hasSize(20);
    }

    @Test
    void shouldReturnTheDefaultResultsWithApiLimits() throws Exception {
        ScenarioTestSupport.Answer withDates = answer("1", ContentScenarios.LIMITS_QUERY);

        assertThat(withDates.scenarioId()).isEqualTo("content-limits");
        assertThat(withDates.items()).hasSize(20);
        assertThat(withDates.apiLimits().getApiCurrent()).isEqualTo(1);
        assertThat(withDates.apiLimits().getApiOldestTime()).isNotNull();

        ScenarioTestSupport.Answer withoutDates = answer("1", ContentScenarios.LIMITS_WITHOUT_DATES_QUERY);
        assertThat(withoutDates.scenarioId()).isEqualTo("content-limits-without-dates");
        assertThat(withoutDates.apiLimits().getApiOldestTime()).isNull();
        assertThat(withoutDates.apiLimits().getGrabMax()).isEqualTo(200);
    }

    private List<String> names(NewznabXmlItem item) {
        return item.getNewznabAttributes().stream().map(NewznabAttribute::getName).toList();
    }

    private List<String> attributes(NewznabXmlItem item, String name) {
        return item.getNewznabAttributes().stream().filter(attribute -> attribute.getName().equals(name)).map(NewznabAttribute::getValue).toList();
    }

}
