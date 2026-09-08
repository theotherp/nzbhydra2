package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.NewznabParameters;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.TORZNAB;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class TorznabScenariosTest {

    @Test
    void shouldReturnGeneratedTorrentResults() throws Exception {
        NewznabParameters parameters = params("torznab", "query");
        parameters.setCat(List.of(5000));

        ScenarioTestSupport.Answer answer = answer(TORZNAB, parameters);

        assertThat(answer.scenarioId()).isEqualTo("torznab-default");
        assertThat(answer.items()).hasSize(IndexerPersona.API_MAX);
        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexerquery_torznab5000-1");
        assertThat(answer.root().getRssChannel().getNewznabResponse()).isNull();
        NewznabXmlItem item = answer.items().get(0);
        assertThat(item.getNewznabAttributes()).isEmpty();
        assertThat(item.getTorznabAttributes()).extracting(NewznabAttribute::getName).contains("seeders", "peers", "uploadvolumefactor", "downloadvolumefactor");
        assertThat(item.getCategory()).isEqualTo("5000");
        assertThat(item.getGrabs()).isNull();
    }

    @Test
    void shouldReturnTheSameTitlesForEveryIndexerForSameNames() throws Exception {
        ScenarioTestSupport.Answer answer = answer(TORZNAB, params("torznab", DuplicateScenarios.SAME_NAMES_QUERY));

        assertThat(answer.items().get(0).getTitle()).isEqualTo("indexer-1");
    }

}
