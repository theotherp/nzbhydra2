package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The suite's canary for indexer preconditions.
 *
 * <p>{@code shouldSearchMovieByImdbId} asserts a total of exactly 30, which is the three mock indexers of
 * {@link BeforeAll#applyBaseline()} returning ten results each. Nothing in this class writes configuration, so the
 * number is only right if the baseline is established for it - which {@link BaselineExtension} does before every test.
 * Before that, this class free-rode on whichever class had last written the indexer list, and it was the first thing to
 * fail whenever a predecessor left a fourth indexer or a disabled one behind.
 */
@SystemTest
public class MediaSearchSystemTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldSearchMovieByImdbId() {
        NewznabXmlRoot root = search("t=movie", "imdbid=1234567");

        assertThat(root.getRssChannel().getNewznabResponse().getTotal()).isEqualTo(30);
        assertThat(root.getRssChannel().getItems()).hasSize(30);
        assertThat(root.getRssChannel().getItems()).allSatisfy(item -> {
            assertThat(item.getTitle()).startsWith("indexeravengers");
            assertThat(item.getEnclosure().getType()).isEqualTo("application/x-nzb");
        });
    }

    @Test
    public void shouldSearchTvByTvMazeIdAndSeasonEpisode() {
        NewznabXmlRoot root = search("t=tvsearch", "tvmazeid=123", "season=1", "ep=2");

        assertThat(root.getRssChannel().getNewznabResponse().getTotal()).isPositive();
        assertThat(root.getRssChannel().getItems()).isNotEmpty();
        assertThat(root.getRssChannel().getItems()).allSatisfy(item -> {
            assertThat(item.getTitle()).isNotBlank();
            assertThat(item.getEnclosure().getType()).isEqualTo("application/x-nzb");
        });
    }

    @Test
    public void shouldReturnResultsForBookSearch() {
        NewznabXmlRoot root = search("t=book", "title=system-test-book");

        assertThat(root.getRssChannel().getNewznabResponse().getTotal()).isPositive();
        assertThat(root.getRssChannel().getItems()).isNotEmpty();
        assertThat(root.getRssChannel().getItems())
                .allSatisfy(item -> assertThat(item.getEnclosure().getType()).isEqualTo("application/x-nzb"));
    }

    @Test
    public void shouldReturnCapsResponse() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=caps");

        assertThat(response.body())
                .contains("<caps")
                .contains("<search")
                .contains("<tv-search")
                .contains("<category id=\"2000\" name=\"Movies\"");
    }

    private NewznabXmlRoot search(String... parameters) {
        String[] requestParameters = new String[parameters.length + 1];
        requestParameters[0] = "apikey=apikey";
        System.arraycopy(parameters, 0, requestParameters, 1, parameters.length);
        return Jackson.getUnmarshal(hydraClient.get("/api", requestParameters).body());
    }
}
