package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.NewznabParameters;

import java.time.Duration;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class PagingScenariosTest {

    @Test
    void shouldReturnTenOfFortyResultsPerPage() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", PagingScenarios.OFFSET_TEST_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("paging-offsettest");
        assertThat(answer.items()).hasSize(9);
        assertThat(answer.total()).isEqualTo(40);
    }

    @Test
    void shouldReturnNothingBehindTheLastOffsetTestPage() throws Exception {
        NewznabParameters parameters = params("1", PagingScenarios.OFFSET_TEST_QUERY);
        parameters.setOffset(40);

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("paging-offsettest");
        assertThat(answer.items()).isEmpty();
        assertThat(answer.total()).isZero();
    }

    @Test
    void shouldReturnAFullPageAtTheRequestedOffset() throws Exception {
        NewznabParameters parameters = params("1", PagingScenarios.OFFSET_TEST_2_QUERY);
        parameters.setOffset(100);

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("paging-offsettest2");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(300);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexeroffsettest-101");
    }

    @Test
    void shouldMimicDognzbsTotalHandling() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", PagingScenarios.DOGNZB_TOTAL_TEST_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("paging-dognzbtotaltest");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(IndexerPersona.API_MAX);

        NewznabParameters beyondTheEnd = params("1", PagingScenarios.DOGNZB_TOTAL_TEST_QUERY);
        beyondTheEnd.setOffset(300);
        assertThat(answer(beyondTheEnd).items()).isEmpty();
    }

    @Test
    void shouldReturnTheRequestedNumberOfShowResults() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", "show25");

        assertThat(answer.scenarioId()).isEqualTo("paging-show");
        assertThat(answer.items()).hasSize(25);
        assertThat(answer.total()).isEqualTo(25);
    }

    @Test
    void shouldIncludeQueryApiKeyAndCategoryInBlubTitles() throws Exception {
        NewznabParameters parameters = params("1", "blub");
        parameters.setCat(java.util.List.of(2000));

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("paging-blub");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(IndexerPersona.API_MAX);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexerblub_12000-1");
    }

    @Test
    void shouldSpreadPagingResultsOverDays() throws Exception {
        ScenarioTestSupport.Answer answer = answer("10", PagingScenarios.PAGING_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("paging-plain");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(300);
        //Ten results per day for the API key 10
        Duration betweenFirstAndEleventh = Duration.between(answer.items().get(10).getPubDate(), answer.items().get(0).getPubDate());
        assertThat(betweenFirstAndEleventh).isGreaterThan(Duration.of(23, ChronoUnit.HOURS));
    }

    @Test
    void shouldNotSpreadPagingResultsForOtherCasings() throws Exception {
        ScenarioTestSupport.Answer answer = answer("10", "PAGING");

        assertThat(answer.scenarioId()).isEqualTo("paging-plain");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(300);
    }

    @Test
    void shouldClaimTheRequestedTotalForPagingQueriesWithNumber() throws Exception {
        NewznabParameters parameters = params("1", "paging150");
        parameters.setOffset(50);
        parameters.setLimit(100);

        ScenarioTestSupport.Answer answer = answer(parameters);

        assertThat(answer.scenarioId()).isEqualTo("paging-with-total");
        assertThat(answer.items()).hasSize(100);
        assertThat(answer.total()).isEqualTo(150);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexer1-51");
    }

}
