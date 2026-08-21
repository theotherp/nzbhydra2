package org.nzbhydra.config.validation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ConfigReaderWriter;
import org.nzbhydra.config.ConfigWeb;
import org.nzbhydra.config.IndexerConfigService;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.externaltools.ExternalToolsSyncService;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.nzbhydra.config.validation.SensitiveDataConfigValidator.UNCHANGED_MARKER;

/**
 * Drives the whole {@code PUT /internalapi/config} round trip - {@link BaseConfigValidator#prepareForSaving} plus the
 * response {@link ConfigWeb#setConfig} builds - against real validators. Only the collaborators that would need a
 * running application (config file, event publishing, external tools) are mocked, so no Spring context is involved.
 * <p>
 * The client is simulated the way it really behaves: it posts back whatever {@code GET /internalapi/config} handed it,
 * which is {@link BaseConfigValidator#updateAfterLoading} applied to a copy of the saved configuration.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@SuppressWarnings({"rawtypes", "unchecked"})
class ConfigSecretRoundTripTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private ConfigurableEnvironment environment;
    @Mock
    private BaseConfigHandler baseConfigHandler;
    @Mock
    private ExternalToolsSyncService externalToolsSyncService;
    @Mock
    private IndexerConfigService indexerConfigService;
    @Mock
    private ConfigValidator permissiveValidator;

    private final ConfigReaderWriter configReaderWriter = new ConfigReaderWriter();
    private final BaseConfigValidator baseConfigValidator = new BaseConfigValidator();
    private final ConfigWeb configWeb = new ConfigWeb();

    private BaseConfig liveConfig;

    @BeforeEach
    void setUp() {
        final AuthConfigValidator authConfigValidator = new AuthConfigValidator();
        ReflectionTestUtils.setField(authConfigValidator, "userAuthConfigValidator", new UserAuthConfigValidator());
        ReflectionTestUtils.setField(baseConfigValidator, "authConfigValidator", authConfigValidator);
        ReflectionTestUtils.setField(baseConfigValidator, "sensitiveDataConfigValidator", new SensitiveDataConfigValidator());
        ReflectionTestUtils.setField(baseConfigValidator, "categoriesConfigValidator", new CategoriesConfigValidator());
        ReflectionTestUtils.setField(baseConfigValidator, "downloadingConfigValidator", new DownloadingConfigValidator());
        ReflectionTestUtils.setField(baseConfigValidator, "searchingConfigValidator", new SearchingConfigValidator());
        ReflectionTestUtils.setField(baseConfigValidator, "mainConfigValidator", new MainConfigValidator());
        ReflectionTestUtils.setField(baseConfigValidator, "indexerConfigValidator", new IndexerConfigValidator());
        //The per-section validators have their own tests; this one is about the secret round trip, so they are stubbed out
        when(permissiveValidator.doesValidate(any())).thenReturn(true);
        when(permissiveValidator.validateConfig(any(), any(), any())).thenReturn(new ConfigValidationResult());
        ReflectionTestUtils.setField(baseConfigValidator, "configValidatorList", List.of(permissiveValidator));

        ReflectionTestUtils.setField(configWeb, "configProvider", configProvider);
        ReflectionTestUtils.setField(configWeb, "environment", environment);
        ReflectionTestUtils.setField(configWeb, "baseConfigValidator", baseConfigValidator);
        ReflectionTestUtils.setField(configWeb, "baseConfigHandler", baseConfigHandler);
        ReflectionTestUtils.setField(configWeb, "externalToolsSyncService", externalToolsSyncService);
        ReflectionTestUtils.setField(configWeb, "indexerConfigService", indexerConfigService);

        when(environment.getPropertySources()).thenReturn(new MutablePropertySources());
        when(externalToolsSyncService.detectChangedIndexers(any(), any())).thenReturn(Collections.emptySet());
        when(configProvider.getBaseConfig()).thenAnswer(invocation -> liveConfig);
        //BaseConfigHandler.replace() is what makes the validated config the running one
        doAnswer(invocation -> {
            liveConfig = invocation.getArgument(0);
            return null;
        }).when(baseConfigHandler).replace(any(BaseConfig.class));

        liveConfig = savedConfig();
    }

    private static IndexerConfig indexer(String name, String apiKey, String username, String password) {
        final IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setName(name);
        indexerConfig.setHost("http://" + name);
        indexerConfig.setApiKey(apiKey);
        indexerConfig.setUsername(username);
        indexerConfig.setPassword(password);
        return indexerConfig;
    }

    private static DownloaderConfig downloader(String name, String apiKey, String username, String password) {
        final DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setName(name);
        downloaderConfig.setUrl("http://" + name);
        downloaderConfig.setApiKey(apiKey);
        downloaderConfig.setUsername(username);
        downloaderConfig.setPassword(password);
        return downloaderConfig;
    }

    private static UserAuthConfig user(String username, String password) {
        final UserAuthConfig userAuthConfig = new UserAuthConfig();
        userAuthConfig.setUsername(username);
        userAuthConfig.setPassword(password);
        return userAuthConfig;
    }

    /**
     * A saved configuration holding a real credential in every field this packet is about.
     */
    private static BaseConfig savedConfig() {
        final BaseConfig baseConfig = new BaseConfig();
        baseConfig.getMain().setProxyUsername("proxy-user");
        baseConfig.getMain().setProxyPassword("proxy-password");
        baseConfig.setIndexers(new ArrayList<>(List.of(
            indexer("indexer-a", "indexer-a-key", "indexer-a-user", "indexer-a-password"),
            indexer("indexer-b", "indexer-b-key", "indexer-b-user", "indexer-b-password"))));
        baseConfig.getDownloading().setDownloaders(new ArrayList<>(List.of(
            downloader("downloader-a", "downloader-a-key", "downloader-a-user", "downloader-a-password"),
            downloader("downloader-b", "downloader-b-key", "downloader-b-user", "downloader-b-password"))));
        baseConfig.getAuth().setUsers(new ArrayList<>(List.of(
            user("a", "{bcrypt}a-hash"),
            user("b", "{bcrypt}b-hash"),
            user("c", "{bcrypt}c-hash"))));
        return baseConfig;
    }

    /**
     * What {@code GET /internalapi/config} answers for the given saved configuration.
     */
    private BaseConfig maskedViewOf(BaseConfig config) {
        return baseConfigValidator.updateAfterLoading(configReaderWriter.getCopy(config));
    }

    private void assertEverySecretIsMasked(BaseConfig config) {
        assertThat(config.getMain().getProxyUsername()).isEqualTo(UNCHANGED_MARKER);
        assertThat(config.getMain().getProxyPassword()).isEqualTo(UNCHANGED_MARKER);
        for (IndexerConfig indexerConfig : config.getIndexers()) {
            assertThat(indexerConfig.getApiKey()).isEqualTo(UNCHANGED_MARKER);
            assertThat(indexerConfig.getUsername()).contains(UNCHANGED_MARKER);
            assertThat(indexerConfig.getPassword()).contains(UNCHANGED_MARKER);
        }
        for (DownloaderConfig downloaderConfig : config.getDownloading().getDownloaders()) {
            assertThat(downloaderConfig.getApiKey()).isEqualTo(UNCHANGED_MARKER);
            assertThat(downloaderConfig.getUsername()).contains(UNCHANGED_MARKER);
            assertThat(downloaderConfig.getPassword()).contains(UNCHANGED_MARKER);
        }
        for (UserAuthConfig userAuthConfig : config.getAuth().getUsers()) {
            assertThat(userAuthConfig.getPassword()).isEqualTo(UNCHANGED_MARKER);
        }
    }

    private void assertLiveConfigStillHoldsTheRealSecrets() {
        assertThat(liveConfig.getMain().getProxyUsername()).isEqualTo("proxy-user");
        assertThat(liveConfig.getMain().getProxyPassword()).isEqualTo("proxy-password");
        assertThat(liveConfig.getIndexers().get(0).getApiKey()).isEqualTo("indexer-a-key");
        assertThat(liveConfig.getIndexers().get(0).getUsername()).contains("indexer-a-user");
        assertThat(liveConfig.getIndexers().get(0).getPassword()).contains("indexer-a-password");
        assertThat(liveConfig.getIndexers().get(1).getApiKey()).isEqualTo("indexer-b-key");
        assertThat(liveConfig.getDownloading().getDownloaders().get(0).getApiKey()).isEqualTo("downloader-a-key");
        assertThat(liveConfig.getDownloading().getDownloaders().get(0).getUsername()).contains("downloader-a-user");
        assertThat(liveConfig.getDownloading().getDownloaders().get(0).getPassword()).contains("downloader-a-password");
        assertThat(liveConfig.getDownloading().getDownloaders().get(1).getApiKey()).isEqualTo("downloader-b-key");
        assertThat(liveConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}a-hash");
        assertThat(liveConfig.getAuth().getUsers().get(1).getPassword()).isEqualTo("{bcrypt}b-hash");
        assertThat(liveConfig.getAuth().getUsers().get(2).getPassword()).isEqualTo("{bcrypt}c-hash");
    }

    @Test
    void shouldMaskTheSaveResponseExactlyLikeTheLoadResponse() throws Exception {
        final BaseConfig submitted = maskedViewOf(liveConfig);
        submitted.getMain().setHost("1.2.3.4");

        final ConfigValidationResult result = configWeb.setConfig(submitted);

        assertThat(result.getErrorMessages()).isEmpty();
        assertThat(result.isOk()).isTrue();
        assertEverySecretIsMasked(result.getNewConfig());
        assertThat(configReaderWriter.getAsYamlString(result.getNewConfig()))
            .as("The save response must be what a load would answer for the configuration that was just saved")
            .isEqualTo(configReaderWriter.getAsYamlString(maskedViewOf(liveConfig)));
    }

    @Test
    void shouldNotStripTheRunningConfigurationOfItsSecretsWhenMaskingTheResponse() throws Exception {
        final BaseConfig submitted = maskedViewOf(liveConfig);
        submitted.getMain().setHost("1.2.3.4");

        final ConfigValidationResult result = configWeb.setConfig(submitted);

        assertThat(result.isOk()).isTrue();
        assertLiveConfigStillHoldsTheRealSecrets();

        //A second save carrying nothing but the markers the first response returned resolves to the same values again
        final ConfigValidationResult second = configWeb.setConfig(result.getNewConfig());

        assertThat(second.getErrorMessages()).isEmpty();
        assertThat(second.isOk()).isTrue();
        assertEverySecretIsMasked(second.getNewConfig());
        assertLiveConfigStillHoldsTheRealSecrets();
    }

    @Test
    void shouldResolveEverySurvivingSecretByIdentityWhenAListEntryIsRemoved() throws Exception {
        final BaseConfig submitted = maskedViewOf(liveConfig);
        //Remove the middle user and the first entry of each of the other two lists
        submitted.getAuth().getUsers().remove(1);
        submitted.getIndexers().remove(0);
        submitted.getDownloading().getDownloaders().remove(0);

        final ConfigValidationResult result = configWeb.setConfig(submitted);

        assertThat(result.getErrorMessages()).isEmpty();
        assertThat(result.isOk()).isTrue();
        assertThat(liveConfig.getAuth().getUsers()).hasSize(2);
        assertThat(liveConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}a-hash");
        assertThat(liveConfig.getAuth().getUsers().get(1).getPassword())
            .as("The user that shifted into index 1 keeps its own password")
            .isEqualTo("{bcrypt}c-hash");
        assertThat(liveConfig.getIndexers()).hasSize(1);
        assertThat(liveConfig.getIndexers().get(0).getApiKey()).isEqualTo("indexer-b-key");
        assertThat(liveConfig.getIndexers().get(0).getUsername()).contains("indexer-b-user");
        assertThat(liveConfig.getIndexers().get(0).getPassword()).contains("indexer-b-password");
        assertThat(liveConfig.getDownloading().getDownloaders()).hasSize(1);
        assertThat(liveConfig.getDownloading().getDownloaders().get(0).getApiKey()).isEqualTo("downloader-b-key");
        assertThat(liveConfig.getDownloading().getDownloaders().get(0).getUsername()).contains("downloader-b-user");
        assertThat(liveConfig.getDownloading().getDownloaders().get(0).getPassword()).contains("downloader-b-password");
    }

    @Test
    void shouldKeepAPlainRenameWorkingOnAnUnchangedList() throws Exception {
        final BaseConfig submitted = maskedViewOf(liveConfig);
        submitted.getAuth().getUsers().get(0).setUsername("a renamed");
        submitted.getIndexers().get(0).setName("indexer-a renamed");

        final ConfigValidationResult result = configWeb.setConfig(submitted);

        assertThat(result.getErrorMessages()).isEmpty();
        assertThat(result.isOk()).isTrue();
        assertThat(liveConfig.getAuth().getUsers().get(0).getUsername()).isEqualTo("a renamed");
        assertThat(liveConfig.getAuth().getUsers().get(0).getPassword()).isEqualTo("{bcrypt}a-hash");
        assertThat(liveConfig.getAuth().getUsers().get(1).getPassword()).isEqualTo("{bcrypt}b-hash");
        assertThat(liveConfig.getAuth().getUsers().get(2).getPassword()).isEqualTo("{bcrypt}c-hash");
        assertThat(liveConfig.getIndexers().get(0).getName()).isEqualTo("indexer-a renamed");
        assertThat(liveConfig.getIndexers().get(0).getApiKey()).isEqualTo("indexer-a-key");
        assertThat(liveConfig.getIndexers().get(1).getApiKey()).isEqualTo("indexer-b-key");
    }

    @Test
    void shouldRejectASaveWhoseMarkerCannotBeResolvedInsteadOfPersistingIt() throws Exception {
        final BaseConfig submitted = maskedViewOf(liveConfig);
        //An entry the saved configuration has never seen cannot have a stored secret to keep
        submitted.getIndexers().add(indexer("indexer-c", UNCHANGED_MARKER, null, null));

        final ConfigValidationResult result = configWeb.setConfig(submitted);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getErrorMessages()).anyMatch(message -> message.contains("indexers[2].apiKey"));
        assertThat(result.getNewConfig()).isNull();
        verify(baseConfigHandler, never()).replace(any(BaseConfig.class));
        verify(baseConfigHandler, never()).save(true);
        assertThat(liveConfig.getIndexers()).hasSize(2);
        assertLiveConfigStillHoldsTheRealSecrets();
    }

    @Test
    void shouldRejectAMarkerForAUsernameThatDoesNotExistAnyMore() throws Exception {
        final BaseConfig submitted = maskedViewOf(liveConfig);
        submitted.getAuth().getUsers().get(1).setUsername("renamed-in-the-same-save-as-a-removal");
        submitted.getAuth().getUsers().remove(2);

        final ConfigValidationResult result = configWeb.setConfig(submitted);

        assertThat(result.isOk()).isFalse();
        assertThat(result.getErrorMessages()).anyMatch(message -> message.contains("auth.users[1].password"));
        verify(baseConfigHandler, never()).replace(any(BaseConfig.class));
        assertLiveConfigStillHoldsTheRealSecrets();
    }
}
