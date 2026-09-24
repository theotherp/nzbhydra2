package org.nzbhydra.debuginfos;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.ExternalToolConfig;
import org.nzbhydra.config.auth.UserAuthConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.logging.LogAnonymizer;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class DebugInfosProviderTest {

    @Mock
    private ConfigProvider configProviderMock;

    private final LogAnonymizer logAnonymizer = new LogAnonymizer();

    @InjectMocks
    private DebugInfosProvider testee;

    private BaseConfig baseConfig;

    @BeforeEach
    public void setUp() {
        baseConfig = new BaseConfig();
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);
        ReflectionTestUtils.setField(logAnonymizer, "configProvider", configProviderMock);
        ReflectionTestUtils.setField(testee, "logAnonymizer", logAnonymizer);
    }

    @Test
    void shouldRemoveUsernamesFromGenericStorageKeys() throws Exception {
        //Users logged in via OIDC are not in the config, so their names must be removed without knowing them
        baseConfig.getGenericStorage().put("shownUserNews-TheKnick", "{\"ids\":[\"categoriesHint\"]}");
        baseConfig.getGenericStorage().put("guidedTourHidden-John-Doe", "true");
        baseConfig.getGenericStorage().put("FirstStart", "[2019,8,12]");

        String config = testee.getAnonymizedConfig();

        assertThat(config)
                .doesNotContain("TheKnick")
                .doesNotContain("John-Doe")
                .contains("shownUserNews-" + logAnonymizer.anonymizeUsername("TheKnick"))
                .contains("guidedTourHidden-" + logAnonymizer.anonymizeUsername("John-Doe"))
                .contains("categoriesHint")
                .contains("FirstStart");
    }

    @Test
    void shouldRemoveValuesIdentifyingTheUser() throws Exception {
        UserAuthConfig user = new UserAuthConfig();
        user.setUsername("someuser");
        baseConfig.getAuth().getUsers().add(user);
        baseConfig.getAuth().setOidcIssuerUri("https://auth.mydomain.net/application/o/nzbhydra2/");
        baseConfig.getAuth().setOidcClientId("DUEVc0L9xa3qlbyVPY7ezME7dQr9fttlNVhEKsDk");
        baseConfig.getAuth().getAuthHeaderIpRanges().add("93.184.216.34");
        baseConfig.getDownloading().setExternalUrl("https://hydra.mydomain.net");
        baseConfig.getEmby().setEmbyBaseUrl("http://emby.mydomain.net");
        baseConfig.getEmby().setEmbyApiKey("embyapikey");
        ExternalToolConfig externalTool = new ExternalToolConfig();
        externalTool.setHost("http://sonarr.mydomain.net");
        externalTool.setNzbhydraHost("http://hydra.internal.net");
        baseConfig.getExternalTools().getExternalTools().add(externalTool);
        IndexerConfig indexerConfig = new IndexerConfig();
        indexerConfig.setHost("https://indexer.com");
        indexerConfig.getCustomParameters().add("secret=abcdef");
        indexerConfig.getCustomParameters().add("other=ghijkl");
        baseConfig.getIndexers().add(indexerConfig);

        String config = testee.getAnonymizedConfig();

        assertThat(config)
                .doesNotContain("someuser")
                .doesNotContain("mydomain.net")
                .doesNotContain("DUEVc0L9xa3qlbyVPY7ezME7dQr9fttlNVhEKsDk")
                .doesNotContain("93.184.216.34")
                .doesNotContain("embyapikey")
                .doesNotContain("hydra.internal.net")
                .doesNotContain("abcdef")
                .doesNotContain("ghijkl")
                //Indexer hosts are no secret and useful for debugging, the address to bind to does not identify anybody
                .contains("https://indexer.com")
                .contains("host: \"0.0.0.0\"");

        //The config diff in the debug infos is built from the anonymized config
        BaseConfig readConfig = Jackson.YAML_MAPPER.readValue(config, BaseConfig.class);
        assertThat(readConfig.getIndexers().get(0).getCustomParameters()).containsExactly("<REMOVED>", "<REMOVED>");
        assertThat(readConfig.getAuth().getAuthHeaderIpRanges()).hasSize(1).allMatch(x -> x.startsWith("<IP4:"));
        assertThat(readConfig.getAuth().getOidcIssuerUri()).isEqualTo("<REMOVED>");
    }
}
