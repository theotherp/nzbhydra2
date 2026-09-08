package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;

class DuplicateScenariosTest {

    @Test
    void shouldReturnResultsWithoutIndexerSpecificTitles() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DuplicateScenarios.SAME_NAMES_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("duplicates-samenames");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.total()).isEqualTo(1000);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexer-1");
    }

    @Test
    void shouldReturnTitleDuplicatesWithIndexerSpecificAges() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DuplicateScenarios.TITLE_DUPLICATES_QUERY);
        ScenarioTestSupport.Answer other = answer("2", DuplicateScenarios.TITLE_DUPLICATES_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("duplicates-titleduplicates");
        assertThat(answer.items()).hasSize(10);
        assertThat(answer.total()).isEqualTo(10);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("result0");
        assertThat(answer.items().get(0).getPubDate()).isAfter(other.items().get(0).getPubDate());
    }

    @Test
    void shouldReturnActualDuplicates() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DuplicateScenarios.ACTUAL_DUPLICATES_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("duplicates-actualduplicates");
        assertThat(answer.items()).hasSize(10);
        assertThat(answer.items()).extracting(NewznabXmlItem::getTitle).containsOnly(answer.items().get(0).getTitle());
        assertThat(answer.items()).extracting(NewznabXmlItem::getLink).containsOnly(answer.items().get(0).getLink());
    }

    @Test
    void shouldReturnOneDuplicate() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DuplicateScenarios.ONE_DUPLICATE_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("duplicates-oneduplicate");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.total()).isEqualTo(1);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("aDuplicate");
    }

    @Test
    void shouldReturnOneResultOfATitleGroup() throws Exception {
        ScenarioTestSupport.Answer answer = answer("1", DuplicateScenarios.TITLE_GROUP_QUERY);

        assertThat(answer.scenarioId()).isEqualTo("duplicates-titlegroup");
        assertThat(answer.items()).hasSize(1);
        assertThat(answer.total()).isEqualTo(1);
        assertThat(answer.items().get(0).getTitle()).isEqualTo(DuplicateScenarios.TITLE_GROUP_QUERY);
    }

}
