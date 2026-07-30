package org.nzbhydra;

import org.awaitility.Awaitility;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.validation.ConfigValidationResult;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class AuthorizationSystemTest {

    private static final String ADMIN_USERNAME = "authorization-system-admin";
    private static final String STATS_USERNAME = "authorization-system-stats";
    private static final String USER_USERNAME = "authorization-system-user";
    private static final String ADMIN_PASSWORD = "authorization-system-admin-password";
    private static final String STATS_PASSWORD = "authorization-system-stats-password";
    private static final String USER_PASSWORD = "authorization-system-user-password";
    private static final String INTERNAL_API_KEY = "internalApiKey";
    private static final String WRONG_INTERNAL_API_KEY = "authorization-system-wrong-key";
    private static final String WRONG_API_KEY_DESCRIPTION = "Wrong api key";

    @Autowired
    private HydraClient hydraClient;

    private BaseConfig originalConfig;
    private String externalApiKey;

    @BeforeAll
    public void configureAuthentication() {
        originalConfig = getConfig();
        externalApiKey = originalConfig.getMain().getApiKey();

        BaseConfig securedConfig = getConfig();
        securedConfig.getAuth().setAuthType(AuthType.BASIC);
        securedConfig.getAuth().setRestrictAdmin(true);
        securedConfig.getAuth().setRestrictStats(true);
        securedConfig.getAuth().setRestrictSearch(true);
        securedConfig.getAuth().setUsers(List.of(
                user(ADMIN_USERNAME, ADMIN_PASSWORD, true, true),
                user(STATS_USERNAME, STATS_PASSWORD, false, true),
                user(USER_USERNAME, USER_PASSWORD, false, false)
        ));
        assertSuccessfulSave(securedConfig);
        restartAndWait();
    }

    @AfterAll
    public void restoreAuthentication() {
        if (originalConfig == null) {
            return;
        }
        assertSuccessfulSave(originalConfig);
        restartAndWait();
    }

    @Test
    public void shouldRejectMissingInternalApiKey() {
        HydraResponse response = hydraClient.getWithoutInternalApiKey("/internalapi/config").dontRaiseIfUnsuccessful();

        assertThat(response.status()).isEqualTo(401);
    }

    @Test
    public void shouldRejectWrongInternalApiKey() {
        HydraResponse response = hydraClient.getWithInternalApiKey("/internalapi/config", WRONG_INTERNAL_API_KEY)
                .dontRaiseIfUnsuccessful();

        assertThat(response.status()).isEqualTo(401);
    }

    @Test
    public void shouldAllowCorrectInternalApiKey() {
        HydraResponse response = hydraClient.getWithInternalApiKey("/internalapi/config", INTERNAL_API_KEY);

        assertThat(response.status()).isEqualTo(200);
        assertThat(response.as(BaseConfig.class).getAuth().getAuthType()).isEqualTo(AuthType.BASIC);
    }

    @Test
    public void shouldRestrictAdminEndpointForUserRole() {
        HydraResponse userResponse = hydraClient.getWithBasicAuth("/internalapi/config/safe", USER_USERNAME, USER_PASSWORD);
        HydraResponse adminResponse = hydraClient.getWithBasicAuth("/internalapi/config", USER_USERNAME, USER_PASSWORD)
                .dontRaiseIfUnsuccessful();

        assertThat(userResponse.status()).isEqualTo(200);
        assertThat(adminResponse.status()).isEqualTo(403);
    }

    @Test
    public void shouldAllowStatsEndpointForStatsRole() {
        HydraResponse statsResponse = hydraClient.getWithBasicAuth("/stats", STATS_USERNAME, STATS_PASSWORD);
        HydraResponse adminResponse = hydraClient.getWithBasicAuth("/internalapi/config", STATS_USERNAME, STATS_PASSWORD)
                .dontRaiseIfUnsuccessful();
        HydraResponse plainUserResponse = hydraClient.getWithBasicAuth("/stats", USER_USERNAME, USER_PASSWORD)
                .dontRaiseIfUnsuccessful();

        assertThat(statsResponse.status()).isEqualTo(200);
        assertThat(adminResponse.status()).isEqualTo(403);
        assertThat(plainUserResponse.status()).isEqualTo(403);
    }

    @Test
    public void shouldEnforceExternalApiKeyForSearchAndDownload() {
        assertNewznabApiKeyError(apiRequest("t=search", "q=oneresult"));
        assertNewznabApiKeyError(apiRequest("apikey=authorization-system-wrong-api-key", "t=search", "q=oneresult"));

        HydraResponse searchResponse = apiRequest("apikey=" + externalApiKey, "t=search", "q=oneresult");
        NewznabXmlRoot root = Jackson.getUnmarshal(searchResponse.body());
        NewznabXmlItem result = root.getRssChannel().getItems().get(0);
        String identifier = result.getRssGuid().getGuid();
        assertThat(identifier).matches("-?\\d+\\.-?\\d+");

        assertNewznabApiKeyError(apiRequest("t=get", "id=" + identifier));
        assertNewznabApiKeyError(apiRequest("apikey=authorization-system-wrong-api-key", "t=get", "id=" + identifier));
        HydraResponse downloadResponse = apiRequest("apikey=" + externalApiKey, "t=get", "id=" + identifier);
        assertThat(downloadResponse.status()).isEqualTo(200);
        assertThat(downloadResponse.header("Content-Type")).startsWith("application/x-nzb");
        assertThat(downloadResponse.body()).contains("Would download NZB with ID");
    }

    @Test
    public void shouldInvalidateSessionOnLogout() {
        HydraClient.Session session = hydraClient.createSession();
        HydraResponse loginResponse = hydraClient.getWithBasicAuth("/", session, USER_USERNAME, USER_PASSWORD);
        HydraResponse protectedResponse = hydraClient.getWithSession("/internalapi/config/safe", session);
        HydraResponse logoutResponse = hydraClient.postWithSessionWithoutRedirects("/logout", session, null)
                .dontRaiseIfUnsuccessful();
        HydraResponse afterLogoutResponse = hydraClient.getWithSession("/internalapi/config/safe", session)
                .dontRaiseIfUnsuccessful();

        assertThat(loginResponse.status()).isEqualTo(200);
        assertThat(session.hasCookie("JSESSIONID")).isTrue();
        assertThat(protectedResponse.status()).isEqualTo(200);
        assertThat(logoutResponse.status()).isIn(204, 302, 303);
        assertThat(logoutResponse.header("Set-Cookie")).contains("remember-me");
        assertThat(afterLogoutResponse.status()).isEqualTo(401);
    }

    private UserAuthConfig user(String username, String password, boolean maySeeAdmin, boolean maySeeStats) {
        UserAuthConfig user = new UserAuthConfig();
        user.setUsername(username);
        user.setPassword(UserAuthConfig.PASSWORD_ID + password);
        user.setMaySeeAdmin(maySeeAdmin);
        user.setMaySeeStats(maySeeStats);
        return user;
    }

    private BaseConfig getConfig() {
        HydraResponse response = hydraClient.get("/internalapi/config");
        assertThat(response.status()).isEqualTo(200);
        return response.as(BaseConfig.class);
    }

    private void assertSuccessfulSave(BaseConfig config) {
        HydraResponse response = hydraClient.put("/internalapi/config", config);
        ConfigValidationResult validationResult = response.as(ConfigValidationResult.class);

        assertThat(response.status()).isEqualTo(200);
        assertThat(validationResult.isOk()).isTrue();
        assertThat(validationResult.getErrorMessages()).isEmpty();
    }

    private void restartAndWait() {
        HydraResponse response = hydraClient.get("/internalapi/control/restart");
        assertThat(response.status()).isEqualTo(200);

        AtomicBoolean becameUnavailable = new AtomicBoolean();
        Awaitility.await().atMost(Duration.ofSeconds(90)).until(() -> {
            try {
                boolean healthy = hydraClient.get("/actuator/health/ping").status() == 200;
                return becameUnavailable.get() && healthy;
            } catch (RuntimeException e) {
                becameUnavailable.set(true);
                return false;
            }
        });
    }

    private void assertNewznabApiKeyError(HydraResponse response) {
        assertThat(response.status()).isEqualTo(200);
        assertThat(response.header("Content-Type")).startsWith("application/xml");
        assertThat(response.body())
                .contains("<error ")
                .contains("code=\"100\"")
                .contains("description=\"" + WRONG_API_KEY_DESCRIPTION + "\"");
    }

    private HydraResponse apiRequest(String... parameters) {
        return hydraClient.getWithBasicAuth("/api", USER_USERNAME, USER_PASSWORD, parameters);
    }
}
