package org.nzbhydra;

import okhttp3.HttpUrl;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.junit.jupiter.api.Test;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${nzbhydra.host}")
    private String nzbhydraHost;

    @Value("${nzbhydra.port}")
    private int nzbhydraPort;

    @Test
    public void shouldDownloadNzbUsingGetAction() throws Exception {
        String identifier = searchAndGetIdentifier();

        try (Response response = executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", identifier
        ))) {
            assertThat(response.code()).isEqualTo(200);
            assertThat(response.header("Content-Type")).startsWith("application/x-nzb");
            assertThat(response.body().string()).contains("Would download NZB with ID");
        }
    }

    @Test
    public void shouldRejectDownloadWithoutApiKey() throws Exception {
        String identifier = searchAndGetIdentifier();

        try (Response missingKeyResponse = executeRequest("api", Map.of("t", "get", "id", identifier))) {
            assertNewznabXmlError(missingKeyResponse, "100", WRONG_API_KEY_DESCRIPTION);
        }
        try (Response wrongKeyResponse = executeRequest("api", Map.of(
                "apikey", "wrong",
                "t", "get",
                "id", identifier,
                "o", "json"
        ))) {
            assertNewznabJsonError(wrongKeyResponse, "100", WRONG_API_KEY_DESCRIPTION);
        }
        try (Response missingKeyResponse = executeRequest("getnzb/api/" + identifier, Map.of())) {
            assertNewznabXmlError(missingKeyResponse, "100", WRONG_API_KEY_DESCRIPTION);
        }
        try (Response wrongKeyResponse = executeRequest("getnzb/api/" + identifier, Map.of("apikey", "wrong"))) {
            assertNewznabXmlError(wrongKeyResponse, "100", WRONG_API_KEY_DESCRIPTION);
        }
    }

    @Test
    public void shouldRejectInvalidOrExpiredDownloadIdentifier() throws Exception {
        try (Response malformedResponse = executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", "not-an-identifier"
        ))) {
            assertNewznabXmlError(malformedResponse, "300", INVALID_IDENTIFIER_DESCRIPTION);
        }
        try (Response nonexistentResponse = executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", "999999999"
        ))) {
            assertNewznabXmlError(nonexistentResponse, "300", INVALID_IDENTIFIER_DESCRIPTION);
        }
        try (Response jsonResponse = executeRequest("api", Map.of(
                "apikey", "apikey",
                "t", "get",
                "id", "not-an-identifier",
                "o", "json"
        ))) {
            assertNewznabJsonError(jsonResponse, "300", INVALID_IDENTIFIER_DESCRIPTION);
        }
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

    private Response executeRequest(String path, Map<String, String> parameters) throws Exception {
        HttpUrl.Builder url = new HttpUrl.Builder()
                .scheme("http")
                .host(nzbhydraHost)
                .port(nzbhydraPort)
                .addPathSegments(path);
        parameters.forEach(url::addQueryParameter);
        return new OkHttpClient().newCall(new Request.Builder().url(url.build()).build()).execute();
    }

    private void assertNewznabXmlError(Response response, String code, String description) throws Exception {
        assertThat(response.code()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/xml");
        assertThat(response.body().string())
                .startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
                .contains("<error ")
                .contains("code=\"" + code + "\"")
                .contains("description=\"" + description + "\"/>")
                .doesNotContain("contentHeader", "searchType");
    }

    private void assertNewznabJsonError(Response response, String code, String description) throws Exception {
        assertThat(response.code()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/json");
        var error = Jackson.JSON_MAPPER.readTree(response.body().string());
        assertThat(error.size()).isEqualTo(2);
        assertThat(error.get("code").asString()).isEqualTo(code);
        assertThat(error.get("description").asString()).isEqualTo(description);
    }
}
