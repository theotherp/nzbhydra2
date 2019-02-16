package org.nzbhydra.migration;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import org.junit.Before;
import org.junit.Test;
import org.mockito.*;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.auth.AuthConfig;
import org.nzbhydra.config.auth.AuthType;
import org.nzbhydra.config.category.CategoriesConfig;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.downloading.*;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.IndexerConfigSynchronizer;
import org.nzbhydra.config.indexer.IndexerState;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.indexers.capscheck.CheckCapsResponse;
import org.nzbhydra.indexers.capscheck.NewznabChecker;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mediainfo.InfoProvider.IdType;
import org.nzbhydra.migration.JsonConfigMigration.ConfigMigrationResult;
import org.nzbhydra.searching.CategoryProvider;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Arrays;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.*;
import static org.junit.Assert.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class ConfigMigrationTest {

    @Mock
    private ConfigProvider configProviderMock;
    @Mock
    private CategoryProvider categoryProviderMock;
    @Mock
    private Category categoryMock1;
    @Mock
    private BaseConfig baseConfig;
    @Mock
    private MainConfig mainConfigMock;
    @Mock
    private IndexerConfigSynchronizer indexerConfigSynchronizerMock;
    @Mock
    private CategoriesConfig categoriesConfigMock;
    @Mock
    private NewznabChecker newznabCheckerMock;
    @Mock
    private ApplicationEventPublisher applicationEventPublisherMock;
    @Captor
    private ArgumentCaptor<IndexerConfig> indexerConfigsCaptor;

    @Mock
    private Category categoryMock2;

    private Category animeCategory = new Category("Anime");
    private Category audioCategory = new Category("Audio");


    @InjectMocks
    private JsonConfigMigration testee = new JsonConfigMigration();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        when(baseConfig.getCategoriesConfig()).thenReturn(categoriesConfigMock);
        BaseConfig baseConfig = new BaseConfig();
        baseConfig.getMain().setPort(5076);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig, this.baseConfig);

        when(categoryProviderMock.getCategories()).thenReturn(Arrays.asList(categoryMock1, categoryMock2, animeCategory, audioCategory));
        when(categoryMock1.getName()).thenReturn("Movies");
        when(categoryMock2.getName()).thenReturn("Movies HD");
        when(this.baseConfig.getCategoriesConfig()).thenReturn(categoriesConfigMock);
        baseConfig.getCategoriesConfig().setCategories(Arrays.asList(animeCategory, audioCategory));

        when(newznabCheckerMock.checkCaps(any(IndexerConfig.class))).thenAnswer(new Answer<CheckCapsResponse>() {
            @Override
            public CheckCapsResponse answer(InvocationOnMock invocation) throws Throwable {
                IndexerConfig config = invocation.getArgument(0);
                config.setConfigComplete(true);
                config.setAllCapsChecked(true);
                return new CheckCapsResponse(invocation.getArgument(0), true, true);
            }
        });
    }

    @Test
    public void testMigration1() throws Exception {
        String json = Resources.toString(Resources.getResource(ConfigMigrationTest.class, "nzbHydra1Config1.cfg"), Charsets.UTF_8);
        ConfigMigrationResult result = testee.migrate(json);

        AuthConfig auth = result.getMigratedConfig().getAuth();
        assertThat(auth.getAuthType(), is(AuthType.BASIC));
        assertThat(auth.isRememberUsers(), is(true));
        assertThat(auth.getRememberMeValidityDays(), is(21));
        assertThat(auth.isRestrictAdmin(), is(true));
        assertThat(auth.isRestrictDetailsDl(), is(true));
        assertThat(auth.isRestrictIndexerSelection(), is(true));
        assertThat(auth.isRestrictSearch(), is(true));
        assertThat(auth.isRestrictStats(), is(true));

        assertThat(auth.getUsers().size(), is(3));
        assertThat(auth.getUsers().get(0).isMaySeeAdmin(), is(true));
        assertThat(auth.getUsers().get(0).isMaySeeStats(), is(true));
        assertThat(auth.getUsers().get(0).isMaySeeDetailsDl(), is(true));
        assertThat(auth.getUsers().get(0).isShowIndexerSelection(), is(true));
        assertThat(auth.getUsers().get(0).getUsername(), is("auser"));
        assertThat(auth.getUsers().get(0).getPassword(), is("apass"));


        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().size(), is(3));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getName(), is("NZBGet"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getDefaultCategory(), is("No category"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getDownloaderType(), is(DownloaderType.NZBGET));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getDownloadType(), is(DownloadType.NZB));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getIconCssClass(), is("someClass"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getUrl(), is("http://127.0.0.1:6789"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getUsername().get(), is("nzbget"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getPassword().get(), is("nzbget"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).isEnabled(), is(true));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(0).getNzbAddingType(), is(NzbAddingType.SEND_LINK));

        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).getName(), is("SABnzbd"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).getDownloaderType(), is(DownloaderType.SABNZBD));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).getDownloadType(), is(DownloadType.NZB));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).getUrl(), is("http://127.0.0.1:8085/sabnzbd/"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).isEnabled(), is(false));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).getNzbAddingType(), is(NzbAddingType.UPLOAD));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(1).getApiKey(), is("apikey"));

        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(2).getUrl(), is("https://127.0.0.1:6789"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(2).getUsername().get(), is("nzbgetx"));
        assertThat(result.getMigratedConfig().getDownloading().getDownloaders().get(2).getPassword().get(), is("tegbzn6789x"));

        assertThat(result.getMigratedConfig().getIndexers().size(), is(4));
        assertThat(result.getMigratedConfig().getIndexers().get(0).getName(), is("Binsearch"));
        assertThat(result.getMigratedConfig().getIndexers().get(0).getEnabledForSearchSource(), is(SearchSourceRestriction.INTERNAL));
        assertThat(result.getMigratedConfig().getIndexers().get(0).getState(), is(IndexerState.DISABLED_USER));
        assertThat(result.getMigratedConfig().getIndexers().get(0).getTimeout().get(), is(9));
        assertThat(result.getMigratedConfig().getIndexers().get(0).getSearchModuleType(), is(SearchModuleType.BINSEARCH));
        assertThat(result.getMigratedConfig().getIndexers().get(0).isConfigComplete(), is(true));

        assertThat(result.getMigratedConfig().getIndexers().get(1).getSearchModuleType(), is(SearchModuleType.NZBINDEX));
        assertThat(result.getMigratedConfig().getIndexers().get(1).getEnabledForSearchSource(), is(SearchSourceRestriction.BOTH));
        assertThat(result.getMigratedConfig().getIndexers().get(1).getState(), is(IndexerState.ENABLED));
        assertThat(result.getMigratedConfig().getIndexers().get(1).isConfigComplete(), is(true));

        assertThat(result.getMigratedConfig().getIndexers().get(2).getSearchModuleType(), is(SearchModuleType.NEWZNAB));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getApiKey(), is("apikey"));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getEnabledForSearchSource(), is(SearchSourceRestriction.API));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchTypes().contains(ActionAttribute.MOVIE), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchTypes().contains(ActionAttribute.TVSEARCH), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchIds().contains(IdType.IMDB), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchIds().contains(IdType.TVRAGE), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchIds().contains(IdType.TVDB), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchIds().contains(IdType.TRAKT), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getSupportedSearchIds().contains(IdType.TVMAZE), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getDownloadLimit().get(), is(50));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getHitLimit().get(), is(100));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getHitLimitResetTime().get(), is(3));
        assertThat(result.getMigratedConfig().getIndexers().get(2).isPreselect(), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(2).getScore().get(), is(10));
        assertThat("Previously disabled indexer should still be disabled", result.getMigratedConfig().getIndexers().get(2).getState(), is(IndexerState.DISABLED_USER));
        assertThat("Previously disabled indexer should have incomplete config because its caps were not checked", result.getMigratedConfig().getIndexers().get(2).isConfigComplete(), is(false));
        assertThat("Newznab indexers should be disabled until caps were checked", result.getMigratedConfig().getIndexers().get(2).getState(), is(IndexerState.DISABLED_USER));
        assertThat("Newznab indexers should be marked with config incomplete", result.getMigratedConfig().getIndexers().get(2).isConfigComplete(), is(false));

        assertThat(result.getMigratedConfig().getIndexers().get(3).getEnabledCategories().size(), is(4));
        assertThat(result.getMigratedConfig().getIndexers().get(3).getEnabledCategories().contains("Movies"), is(true));
        assertThat(result.getMigratedConfig().getIndexers().get(3).getEnabledCategories().contains("Movies HD"), is(true));
        assertThat("Previously enabled indexer should still be enabled", result.getMigratedConfig().getIndexers().get(3).getState(), is(IndexerState.ENABLED));
        assertThat("Previously enabled indexer should have ccomplete config because its caps were checked", result.getMigratedConfig().getIndexers().get(3).isConfigComplete(), is(true));
        verify(newznabCheckerMock, times(1)).checkCaps(indexerConfigsCaptor.capture());
        assertThat(indexerConfigsCaptor.getValue().getName(), is("Drunken Slug"));

        assertThat(result.getMigratedConfig().getMain().getHost(), is("127.0.0.1"));
        assertThat(result.getMigratedConfig().getMain().getProxyType(), is(ProxyType.SOCKS));
        assertThat(result.getMigratedConfig().getMain().getProxyHost(), is("proxydomain.com"));
        assertThat(result.getMigratedConfig().getMain().getProxyUsername(), is("user"));
        assertThat(result.getMigratedConfig().getMain().getProxyPassword(), is("pass"));
        assertThat(result.getMigratedConfig().getMain().getProxyPort(), is(1080));
        assertThat(result.getMigratedConfig().getMain().getPort(), is(5076));
        assertThat(result.getMigratedConfig().getMain().isShutdownForRestart(), is(true));
        assertThat(result.getMigratedConfig().getMain().isSsl(), is(false));
        assertThat(result.getMigratedConfig().getMain().isStartupBrowser(), is(true));
        assertThat(result.getMigratedConfig().getMain().getTheme(), is("grey"));
        assertThat(result.getMigratedConfig().getMain().getUrlBase().isPresent(), is(false));

        assertThat(result.getMigratedConfig().getSearching().getApplyRestrictions(), is(SearchSourceRestriction.BOTH));
        assertThat(result.getMigratedConfig().getSearching().getDuplicateAgeThreshold(), is(2.0F));
        assertThat(result.getMigratedConfig().getSearching().getDuplicateSizeThresholdInPercent(), is(1.0F));
        assertThat(result.getMigratedConfig().getSearching().getKeepSearchResultsForDays(), is(14));
        assertThat(result.getMigratedConfig().getSearching().getForbiddenGroups(), is(empty()));
        assertThat(result.getMigratedConfig().getSearching().getForbiddenPosters(), is(empty()));
        assertThat(result.getMigratedConfig().getSearching().getForbiddenWords(), is(empty()));
        assertThat(result.getMigratedConfig().getSearching().getForbiddenRegex().isPresent(), is(false));
        assertThat(result.getMigratedConfig().getSearching().getGenerateQueries(), is(SearchSourceRestriction.NONE));
        assertThat(result.getMigratedConfig().getSearching().getIdFallbackToQueryGeneration(), is(SearchSourceRestriction.INTERNAL));
        assertThat(result.getMigratedConfig().getSearching().isIgnorePassworded(), is(true));
        assertThat(result.getMigratedConfig().getSearching().isIgnoreTemporarilyDisabled(), is(true));
        assertThat(result.getMigratedConfig().getSearching().getMaxAge().get(), is(2000));
        assertThat(result.getMigratedConfig().getSearching().getNzbAccessType(), is(FileDownloadAccessType.REDIRECT));
        assertThat(result.getMigratedConfig().getSearching().getRemoveTrailing(), hasItems("Spanish", "-German", ".rar"));
        assertThat(result.getMigratedConfig().getSearching().getRequiredRegex().isPresent(), is(false));
        assertThat(result.getMigratedConfig().getSearching().getRequiredWords(), is(empty()));
        assertThat(result.getMigratedConfig().getSearching().getTimeout(), is(20));
        assertThat(result.getMigratedConfig().getSearching().getUserAgent().get(), is("Chrome"));

        assertThat(result.getMigratedConfig().getCategoriesConfig().isEnableCategorySizes(), is(true));
        boolean animeChecked = false;
        boolean audioChecked = false;
        for (Category category : result.getMigratedConfig().getCategoriesConfig().getCategories()) {
            if (category.getName().equals("Anime")) {
                animeChecked = true;
                assertThat(category.getApplyRestrictionsType(), is(SearchSourceRestriction.INTERNAL));
                assertThat(category.getForbiddenRegex().get(), is("forbiddenRegex"));
                assertThat(category.getForbiddenWords(), contains("forbidden", "words"));
                assertThat(category.getRequiredRegex().get(), is("requiredRegex"));
                assertThat(category.getRequiredWords(), contains("required", "words"));
                assertThat(category.getMinSizePreset().get(), is(11));
                assertThat(category.getMaxSizePreset().get(), is(12));
                assertThat(category.getNewznabCategories().stream().anyMatch(x -> x.size() == 1 && x.get(0) == 5071), is(true));
            }
            if (category.getName().equals("Audio")) {
                audioChecked = true;
                assertThat(category.getApplyRestrictionsType(), is(SearchSourceRestriction.BOTH));
                assertThat(category.getForbiddenWords(), contains("soundgarden"));
                assertThat(category.getRequiredWords(), contains("mp3", "flac"));
            }
        }
        assertThat(animeChecked, is(true));
        assertThat(audioChecked, is(true));
    }

    @Test
    public void testMigrationWithActualOldSettings() throws Exception {

        String json = Resources.toString(Resources.getResource(ConfigMigrationTest.class, "nzbHydra1Config2.cfg"), Charsets.UTF_8);
        testee.migrate(json);
        //Just to see if it runs
    }


}