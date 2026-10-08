package org.nzbhydra.genericstorage;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenericStorageWebTest {

    @Mock
    private GenericStorage genericStorage;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private HttpServletRequest request;
    @InjectMocks
    private GenericStorageWeb testee;

    private static final String NATIVE_BUILD_PROPERTY = "HYDRA_NATIVE_BUILD";

    private final BaseConfig baseConfig = new BaseConfig();
    private String previousNativeBuildProperty;

    @BeforeEach
    void setUp() {
        lenient().when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        baseConfig.getAuth().setAuthType(AuthType.BASIC);
        //The native build workflow exports HYDRA_NATIVE_BUILD=true for its unit test step as well, and with it the
        //auth NONE bypass is off (as in HydraGlobalMethodSecurityConfiguration). These tests cover the JVM behaviour.
        previousNativeBuildProperty = System.getProperty(NATIVE_BUILD_PROPERTY);
        System.setProperty(NATIVE_BUILD_PROPERTY, "false");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        if (previousNativeBuildProperty == null) {
            System.clearProperty(NATIVE_BUILD_PROPERTY);
        } else {
            System.setProperty(NATIVE_BUILD_PROPERTY, previousNativeBuildProperty);
        }
    }

    private static void authenticateWith(String... roles) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user", "pw", AuthorityUtils.createAuthorityList(roles)));
    }

    private static void assertStatus(Runnable call, HttpStatus status) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode()).isEqualTo(status));
    }

    @Test
    void shouldRejectUnknownKeysWithoutTouchingStorage() {
        authenticateWith("ROLE_ADMIN");

        assertStatus(() -> testee.put("someRandomKey", false, "true", request), HttpStatus.NOT_FOUND);
        assertStatus(() -> testee.get("someRandomKey", false, request), HttpStatus.NOT_FOUND);

        verifyNoInteractions(genericStorage);
    }

    @Test
    void shouldRejectInternalKeysEvenForAdminAndWithoutAuth() {
        baseConfig.getAuth().setAuthType(AuthType.NONE);
        for (String key : new String[]{"UpdateData", "BackupData", "VIP_EXPIRY", "ScheduledRestartData", "automaticUpdateToNotice",
                "FirstStart", "PORT_OPEN_LAST_CHECK", "outdatedWrapperDetected", "guidedTourHidden-alice", "shownUserNews-alice",
                "userPreferences", "userPreferences-alice"}) {
            assertStatus(() -> testee.get(key, false, request), HttpStatus.NOT_FOUND);
            assertStatus(() -> testee.put(key, false, "{}", request), HttpStatus.NOT_FOUND);
        }

        verifyNoInteractions(genericStorage);
    }

    @Test
    void shouldRejectUserSuffixInPathEvenForForeignUser() {
        authenticateWith("ROLE_USER");
        lenient().when(request.getRemoteUser()).thenReturn("bob");

        assertStatus(() -> testee.get("themePreference-alice", true, request), HttpStatus.NOT_FOUND);
        assertStatus(() -> testee.put("themePreference-alice", true, "\"dark\"", request), HttpStatus.NOT_FOUND);

        verifyNoInteractions(genericStorage);
    }

    @Test
    void shouldRequireAdminForProblemDetectionFlags() {
        authenticateWith("ROLE_USER", "ROLE_STATS");

        for (String key : new String[]{"outOfMemoryDetected", "showOpenToInternetWithoutAuth", "belowJava17", "FAILED_BACKUP"}) {
            assertStatus(() -> testee.get(key, false, request), HttpStatus.FORBIDDEN);
            assertStatus(() -> testee.put(key, false, "false", request), HttpStatus.FORBIDDEN);
        }
        verifyNoInteractions(genericStorage);

        authenticateWith("ROLE_ADMIN");
        testee.put("belowJava17", false, "false", request);
        verify(genericStorage).save("belowJava17", "false");
        when(genericStorage.get("belowJava17", Object.class)).thenReturn(Optional.of(true));
        assertThat(testee.get("belowJava17", false, request)).isEqualTo(true);
    }

    @Test
    void shouldRejectAnonymousWithoutRolesWhenAuthIsConfigured() {
        authenticateWith("ROLE_ANONYMOUS");

        assertStatus(() -> testee.get("themePreference", true, request), HttpStatus.FORBIDDEN);
        assertStatus(() -> testee.put("isGroupEpisodesHelpShown", true, "true", request), HttpStatus.FORBIDDEN);
        SecurityContextHolder.clearContext();
        assertStatus(() -> testee.get("themePreference", true, request), HttpStatus.FORBIDDEN);

        verifyNoInteractions(genericStorage);
    }

    @Test
    void shouldStorePerUserKeysPerUser() {
        authenticateWith("ROLE_STATS");
        when(request.getRemoteUser()).thenReturn("alice");

        testee.put("themePreference", true, "\"dark\"", request);

        verify(genericStorage).save("themePreference-alice", "\"dark\"");
    }

    @Test
    void shouldAlwaysSuffixPerUserKeysWithTheRemoteUser() {
        authenticateWith("ROLE_USER");
        when(request.getRemoteUser()).thenReturn("alice");
        when(genericStorage.get("isGroupEpisodesHelpShown-alice", Object.class)).thenReturn(Optional.of("true"));

        assertThat(testee.get("isGroupEpisodesHelpShown", false, request)).isEqualTo("true");
    }

    @Test
    void shouldAllowEverythingAllowedWithoutAuth() {
        baseConfig.getAuth().setAuthType(AuthType.NONE);

        testee.put("belowJava17", false, "false", request);
        testee.put("themePreference", true, "\"light\"", request);
        testee.put("isGroupEpisodesHelpShown", true, "true", request);
        testee.get("FAILED_BACKUP", false, request);

        verify(genericStorage).save("belowJava17", "false");
        verify(genericStorage).save("themePreference", "\"light\"");
        verify(genericStorage).save("isGroupEpisodesHelpShown", "true");
        verify(genericStorage).get("FAILED_BACKUP", Object.class);
    }

    @Test
    void shouldRejectOversizeBody() {
        authenticateWith("ROLE_ADMIN");

        assertStatus(() -> testee.put("themePreference", true, "\"" + "a".repeat(GenericStorageWeb.MAX_BODY_LENGTH) + "\"", request),
                HttpStatus.CONTENT_TOO_LARGE);

        verify(genericStorage, never()).save(anyString(), any());
    }

    @Test
    void shouldRejectInvalidOrWronglyShapedBodies() {
        authenticateWith("ROLE_ADMIN");

        assertStatus(() -> testee.put("belowJava17", false, "not json{", request), HttpStatus.BAD_REQUEST);
        assertStatus(() -> testee.put("belowJava17", false, "\"false\"", request), HttpStatus.BAD_REQUEST);
        assertStatus(() -> testee.put("belowJava17", false, "{\"a\":1}", request), HttpStatus.BAD_REQUEST);
        assertStatus(() -> testee.put("themePreference", true, "true", request), HttpStatus.BAD_REQUEST);
        assertStatus(() -> testee.put("themePreference", true, "\"" + "a".repeat(GenericStorageWeb.MAX_STRING_LENGTH + 1) + "\"", request),
                HttpStatus.BAD_REQUEST);

        verify(genericStorage, never()).save(anyString(), any());
    }
}
