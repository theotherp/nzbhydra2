package org.nzbhydra;

import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.core.type.TypeReference;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class ExternalApiDownloadSystemTest {

    private static final String INVALID_IDENTIFIER_DESCRIPTION = "Invalid or outdated search result ID";
    private static final String WRONG_API_KEY_DESCRIPTION = "Wrong api key";

    @Autowired
    private HydraClient hydraClient;

    @Test
    public void shouldDownloadNzbUsingGetAction() {
        String identifier = searchAndGetIdentifier();

        HydraResponse response = executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", identifier
        ));
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/x-nzb");
        assertThat(response.body()).contains("Would download NZB with ID");
    }

    @Test
    public void shouldRejectDownloadWithoutApiKey() {
        String identifier = searchAndGetIdentifier();

        assertNewznabXmlError(executeRequest("api", Map.of("t", "get", "id", identifier)), "100", WRONG_API_KEY_DESCRIPTION);
        assertNewznabJsonError(executeRequest("api", Map.of(
                "apikey", "wrong",
                "t", "get",
                "id", identifier,
                "o", "json"
        )), "100", WRONG_API_KEY_DESCRIPTION);
        assertNewznabXmlError(executeRequest("getnzb/api/" + identifier, Map.of()), "100", WRONG_API_KEY_DESCRIPTION);
        assertNewznabXmlError(executeRequest("getnzb/api/" + identifier, Map.of("apikey", "wrong")), "100", WRONG_API_KEY_DESCRIPTION);
    }

    @Test
    public void shouldRejectInvalidOrExpiredDownloadIdentifier() {
        assertNewznabXmlError(executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", "not-an-identifier"
        )), "300", INVALID_IDENTIFIER_DESCRIPTION);
        assertNewznabXmlError(executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", "999999999"
        )), "300", INVALID_IDENTIFIER_DESCRIPTION);
        assertNewznabJsonError(executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", "not-an-identifier",
                "o", "json"
        )), "300", INVALID_IDENTIFIER_DESCRIPTION);
    }

    @Test
    public void shouldReturnNfoForResult() {
        String identifier = searchAndGetIdentifier();
        long guid = Long.parseLong(identifier.substring(0, identifier.indexOf('.')));

        HydraResponse response = hydraClient.get("/internalapi/nfo/" + guid);
        Map<String, Object> nfoResult = response.as(new TypeReference<>() {
        });

        assertThat(response.status()).isEqualTo(200);
        assertThat(nfoResult.get("successful")).isEqualTo(true);
        assertThat(nfoResult.get("hasNfo")).isEqualTo(true);
        assertThat((String) nfoResult.get("content")).startsWith("NFO for NZB with ID ");
    }

    private String searchAndGetIdentifier() {
        HydraResponse response = hydraClient.get("/api", "apikey=apikey", "t=search", "q=oneresult");
        NewznabXmlRoot root = Jackson.getUnmarshal(response.body());
        NewznabXmlItem result = root.getRssChannel().getItems().get(0);
        String identifier = result.getRssGuid().getGuid();
        assertThat(identifier).matches("-?\\d+\\.-?\\d+");
        return identifier;
    }

    private HydraResponse executeRequest(String path, Map<String, String> parameters) {
        String[] requestParameters = parameters.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .toArray(String[]::new);
        return hydraClient.get("/" + path, requestParameters);
    }

    private void assertNewznabXmlError(HydraResponse response, String code, String description) {
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/xml");
        assertThat(response.body())
                .startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
                .contains("<error ")
                .contains("code=\"" + code + "\"")
                .contains("description=\"" + description + "\"/>")
                .doesNotContain("contentHeader", "searchType");
    }

    private void assertNewznabJsonError(HydraResponse response, String code, String description) {
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/json");
        try {
            var error = Jackson.JSON_MAPPER.readTree(response.body());
            assertThat(error.size()).isEqualTo(2);
            assertThat(error.get("code").asString()).isEqualTo(code);
            assertThat(error.get("description").asString()).isEqualTo(description);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
