package org.nzbhydra;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.json.NewznabJsonItem;
import org.nzbhydra.mapping.newznab.json.NewznabJsonRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class ExternalApiJsonSystemTest {

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldReturnNewznabSearchResultsAsJson() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=oneresult", "o=json");

        NewznabJsonRoot root = response.as(NewznabJsonRoot.class);

        assertThat(root.getChannel().getResponse().getAttributes().getTotal()).isEqualTo("3");
        assertThat(root.getChannel().getItem()).hasSize(3);
        assertThat(root.getChannel().getItem())
                .extracting(NewznabJsonItem::getTitle)
                .containsOnly("indexeroneresult");
    }

    @Test
    public void shouldReturnJsonAttributesAndDownloadEnclosure() throws Exception {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=oneresult", "o=json");
        assertThat(response.header("Content-Type")).startsWith("application/json");
        NewznabJsonRoot root = response.as(NewznabJsonRoot.class);
        NewznabJsonItem item = root.getChannel().getItem().get(0);

        assertThat(item.getGuid()).isNotBlank();
        assertThat(item.getCategory()).isNotBlank();
        assertThat(item.getEnclosure().getAttributes().getLength()).matches("\\d+");
        assertThat(item.getEnclosure().getAttributes().getType()).isEqualTo("application/x-nzb");
        assertThat(item.getEnclosure().getAttributes().getUrl()).isEqualTo(item.getLink());
        assertThat(item.getAttr())
                .extracting(attribute -> attribute.getAttributes().getName())
                .contains("guid", "size", "hydraIndexerScore", "hydraIndexerHost", "hydraIndexerName");

        try (Response downloadResponse = new OkHttpClient().newCall(
                new Request.Builder().url(item.getEnclosure().getAttributes().getUrl()).build()
        ).execute()) {
            assertThat(downloadResponse.header("Content-Type")).startsWith("application/x-nzb");
            assertThat(downloadResponse.body().string()).contains("Would download NZB");
        }
    }

    @Test
    public void shouldReturnStructuredJsonErrorForInvalidRequest() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=get", "o=json");

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/json");
        assertThat(response.body())
                .contains("\"code\"")
                .contains("200")
                .contains("Missing ID/GUID");
    }
}
