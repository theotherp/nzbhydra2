package org.nzbhydra.mockserver.newznab;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.answer;
import static org.nzbhydra.mockserver.newznab.ScenarioTestSupport.params;

class GroupingScenariosTest {

    @Test
    void shouldReturnTheSameDuplicateForEveryIndexer() throws Exception {
        ScenarioTestSupport.Answer one = answer("1", GroupingScenarios.GROUPING_QUERY);
        ScenarioTestSupport.Answer two = answer("2", GroupingScenarios.GROUPING_QUERY);

        assertThat(one.scenarioId()).isEqualTo("grouping-newznab");
        assertThat(one.items()).hasSize(5);

        //Everything the duplicate detection compares has to be identical, or the two indexers' copies end up in
        //separate buckets and the scenario stops showing a duplicate group
        NewznabXmlItem first = duplicate(one);
        NewznabXmlItem second = duplicate(two);
        assertThat(second.getTitle()).isEqualTo(first.getTitle());
        assertThat(second.getPubDate()).isEqualTo(first.getPubDate());
        assertThat(attributes(second).get("size")).isEqualTo(attributes(first).get("size"));
        assertThat(attributes(second).get("poster")).isEqualTo(attributes(first).get("poster"));
        assertThat(attributes(second).get("group")).isEqualTo(attributes(first).get("group"));
    }

    @Test
    void shouldReturnTitleGroupMembersThatNormalizeEquallyWithoutBeingDuplicates() throws Exception {
        ScenarioTestSupport.Answer one = answer("1", GroupingScenarios.GROUPING_QUERY);
        ScenarioTestSupport.Answer two = answer("2", GroupingScenarios.GROUPING_QUERY);

        NewznabXmlItem first = titleGroupMember(one);
        NewznabXmlItem second = titleGroupMember(two);
        assertThat(normalize(second.getTitle())).isEqualTo(normalize(first.getTitle()));
        //The group attribute alone already keeps the detector from pairing them, whatever the configured thresholds
        assertThat(attributes(second).get("group")).isNotEqualTo(attributes(first).get("group"));
    }

    @Test
    void shouldReturnTwoEpisodesOfOneSeasonWithGroupingAttributes() throws Exception {
        List<NewznabXmlItem> episodes = answer("1", GroupingScenarios.GROUPING_QUERY).items().stream()
                .filter(item -> item.getTitle().startsWith("Grouping.Show."))
                .toList();

        assertThat(episodes).hasSize(2);
        assertThat(episodes).allSatisfy(item -> {
            assertThat(attributes(item)).containsEntry("showtitle", "Grouping Show");
            assertThat(attributes(item)).containsEntry("season", "2");
            assertThat(attributes(item)).containsEntry("category", "5040");
        });
        //Same season, different episodes: two groups rather than one
        assertThat(episodes).extracting(item -> attributes(item).get("episode")).containsExactly("3", "4");
    }

    @Test
    void shouldReturnDifferentlyNamedReleasesOfTheSameEpisodePerIndexer() throws Exception {
        String one = episode(answer("1", GroupingScenarios.GROUPING_QUERY), "3").getTitle();
        String two = episode(answer("2", GroupingScenarios.GROUPING_QUERY), "3").getTitle();

        //Only the attributes can group these; their titles must not
        assertThat(normalize(two)).isNotEqualTo(normalize(one));
    }

    @Test
    void shouldReturnOneUngroupableResultPerIndexer() throws Exception {
        String one = standalone(answer("1", GroupingScenarios.GROUPING_QUERY)).getTitle();
        String two = standalone(answer("2", GroupingScenarios.GROUPING_QUERY)).getTitle();

        assertThat(normalize(two)).isNotEqualTo(normalize(one));
    }

    @Test
    void shouldAnswerTheSameQueryOnTheTorznabEndpointWithTheTorrentHalves() throws Exception {
        ScenarioTestSupport.Answer torznab = answer(ScenarioTestSupport.TORZNAB,
                params("1", GroupingScenarios.GROUPING_QUERY));
        ScenarioTestSupport.Answer newznab = answer("1", GroupingScenarios.GROUPING_QUERY);

        assertThat(torznab.scenarioId()).isEqualTo("grouping-torznab");
        assertThat(torznab.items()).hasSize(2);
        //The torrent title member joins the newznab title group as soon as the two download types may share one
        assertThat(normalize(torznab.items().get(0).getTitle()))
                .isEqualTo(normalize(titleGroupMember(newznab).getTitle()));
        assertThat(attributes(torznab.items().get(1)))
                .containsEntry("showtitle", "Grouping Show")
                .containsEntry("season", "2")
                .containsEntry("episode", "3");
        assertThat(torznab.items()).allSatisfy(item ->
                assertThat(item.getEnclosure().getType()).isEqualTo("application/x-bittorrent"));
    }

    @Test
    void shouldAnswerTheScenarioIdsAndCasingVariantsToo() throws Exception {
        //The scenario ids are what /mock/scenarios lists, so searching for one of those has to land here rather than
        //in the default scenario's hundreds of generated results
        for (String query : List.of("grouping", "Grouping", "grouping-newznab", "grouping-torznab")) {
            assertThat(answer("1", query).scenarioId())
                    .describedAs("query %s", query)
                    .isEqualTo("grouping-newznab");
        }
        assertThat(answer(ScenarioTestSupport.TORZNAB, params("1", "grouping-torznab")).scenarioId())
                .isEqualTo("grouping-torznab");
    }

    private static NewznabXmlItem duplicate(ScenarioTestSupport.Answer answer) {
        return byTitleStart(answer, "Grouping.Duplicate.");
    }

    private static NewznabXmlItem titleGroupMember(ScenarioTestSupport.Answer answer) {
        return answer.items().stream()
                .filter(item -> normalize(item.getTitle()).startsWith("groupingtitlemovie"))
                .findFirst()
                .orElseThrow();
    }

    private static NewznabXmlItem episode(ScenarioTestSupport.Answer answer, String episode) {
        return answer.items().stream()
                .filter(item -> episode.equals(attributes(item).get("episode")))
                .findFirst()
                .orElseThrow();
    }

    private static NewznabXmlItem standalone(ScenarioTestSupport.Answer answer) {
        return byTitleStart(answer, "Grouping.Standalone.");
    }

    private static NewznabXmlItem byTitleStart(ScenarioTestSupport.Answer answer, String prefix) {
        return answer.items().stream()
                .filter(item -> item.getTitle().startsWith(prefix))
                .findFirst()
                .orElseThrow();
    }

    private static Map<String, String> attributes(NewznabXmlItem item) {
        return item.getNewznabAttributes().stream()
                .collect(Collectors.toMap(NewznabAttribute::getName, NewznabAttribute::getValue, (first, second) -> first));
    }

    /**
     * What the results table does to a title before it groups by it.
     */
    private static String normalize(String title) {
        return title.toLowerCase().replaceAll("[\\s._-]+", "");
    }

}
