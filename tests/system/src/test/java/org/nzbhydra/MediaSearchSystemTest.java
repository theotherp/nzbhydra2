package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
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
