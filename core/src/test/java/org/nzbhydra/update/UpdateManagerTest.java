package org.nzbhydra.update;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.mapping.changelog.ChangelogChangeEntry;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.update.UpdateManager.BlockedVersion;
import org.nzbhydra.webaccess.WebAccess;

import java.util.Arrays;
import java.util.List;

import static junit.framework.TestCase.assertTrue;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
public class UpdateManagerTest {

    @Mock
    private GenericStorage updateDataGenericStorageMock;
    @Mock
    private WebAccess webAccessMock;
    @Mock
    private ConfigProvider configProviderMock;

    private static String changelog = "some changes";

    @InjectMocks
    private UpdateManager testee = new UpdateManager();
    private ObjectMapper objectMapper;
    private BaseConfig baseConfig;

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);

        baseConfig = new BaseConfig();
        MainConfig main = new MainConfig();
        main.setUpdateToPrereleases(false);
        baseConfig.setMain(main);
        when(configProviderMock.getBaseConfig()).thenReturn(baseConfig);

        testee.currentVersionString = "1.0.0";
        testee.repositoryBaseUrl = "http:/127.0.0.1:7070/repos/theotherp/apitests";
        testee.changelogUrl = "http:/127.0.0.1:7070/changelog";
        testee.blockedVersionsUrl = "http:/127.0.0.1:7070/blockedVersions.json";
        testee.afterPropertiesSet();

        Release prerelease = new Release();
        prerelease.setTagName("v2.3.4");
        prerelease.setBody("Some new stuff as prerelease");
        prerelease.setPrerelease(true);

        Release latestRelease = new Release();
        latestRelease.setTagName("v2.0.0");
        latestRelease.setBody("Some new stuff");
        latestRelease.setPrerelease(false);

        Release previousRelease = new Release();
        previousRelease.setTagName("v1.0.0");
        previousRelease.setBody("A list:\n" +
                "* a\n" +
                "* b");
        previousRelease.setPrerelease(false);

        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/repos/theotherp/apitests/releases"), any(TypeReference.class))).thenReturn(
                Arrays.asList(previousRelease, latestRelease, prerelease));

        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/changelog"))).thenReturn(
                objectMapper.writeValueAsString(Arrays.asList(
                        new ChangelogVersionEntry("4.0.0", null, false, Arrays.asList(new ChangelogChangeEntry("note", "this is a prerelease"))),
                        new ChangelogVersionEntry("3.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "a note"))),
                        new ChangelogVersionEntry("2.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("fix", "a minor fix"))),
                        new ChangelogVersionEntry("0.0.1", null, true, Arrays.asList(new ChangelogChangeEntry("feature", "a new feature")))
                )));

        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/blockedVersions.json"))).thenReturn(
                objectMapper.writeValueAsString(Arrays.asList(new BlockedVersion("3.0.0", "comment")))
        );
    }


    @Test
    public void testThatChecksForUpdateAvailable() throws Exception {
        assertTrue(testee.isUpdateAvailable());
        testee.currentVersion = new SemanticVersion("v2.0.0");
        assertFalse(testee.isUpdateAvailable());
    }

    @Test
    public void testThatChecksForUpdateAvailableWithPrerelease() throws Exception {
        assertTrue(testee.isUpdateAvailable());
        configProviderMock.getBaseConfig().getMain().setUpdateToPrereleases(true);
        testee.currentVersion = new SemanticVersion("v2.3.4");
        assertFalse(testee.isUpdateAvailable());
    }

    @Test
    public void shouldGetLatestReleaseFromGithub() throws Exception {
        String latestVersionString = testee.getLatestVersionString();
        assertEquals("2.0.0", latestVersionString);

        //Should not contact repository again if last request was less than 15 minutes ago
        testee.getLatestVersionString();
    }

    @Test
    public void shouldGetAllChangesIncludingPrereleaseWhenRunningFinal() throws Exception {
        //Ensures that when a final version is available the changelog retrieved for the footer also includes the changes from the beta versions before that final version

        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/changelog"))).thenReturn(
                objectMapper.writeValueAsString(Arrays.asList(
                        new ChangelogVersionEntry("2.0.1", null, false, Arrays.asList(new ChangelogChangeEntry("note", "this is a newer prerelease"))),
                        new ChangelogVersionEntry("2.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "Next final release"))),
                        new ChangelogVersionEntry("1.0.1", null, false, Arrays.asList(new ChangelogChangeEntry("note", "A betal release"))),
                        new ChangelogVersionEntry("1.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "Initial final release")))
                )));

        //Should show changes for 1.01 and 2.0.0
        List<ChangelogVersionEntry> changesSince = testee.getChangesSinceCurrentVersion();

        assertEquals(2, changesSince.size());
        assertEquals("2.0.0", changesSince.get(0).getVersion());
        assertEquals("1.0.1", changesSince.get(1).getVersion());
    }

    @Test
    public void shouldGetAllChangesIncludingPrereleaseWhenInstallingPrereleases() throws Exception {
        baseConfig.getMain().setUpdateToPrereleases(true);

        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/changelog"))).thenReturn(
                objectMapper.writeValueAsString(Arrays.asList(
                        new ChangelogVersionEntry("2.0.1", null, false, Arrays.asList(new ChangelogChangeEntry("note", "this is a newer prerelease"))),
                        new ChangelogVersionEntry("2.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "Next final release"))),
                        new ChangelogVersionEntry("1.0.1", null, false, Arrays.asList(new ChangelogChangeEntry("note", "A betal release"))),
                        new ChangelogVersionEntry("1.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "Initial final release")))
                )));

        List<ChangelogVersionEntry> changesSince = testee.getChangesSinceCurrentVersion();

        assertEquals(3, changesSince.size());
        assertEquals("2.0.1", changesSince.get(0).getVersion());
        assertEquals("2.0.0", changesSince.get(1).getVersion());
        assertEquals("1.0.1", changesSince.get(2).getVersion());
    }

    @Test
    public void shouldGetAllChangesWithoutPrerelease() throws Exception {
        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/changelog"))).thenReturn(
                objectMapper.writeValueAsString(Arrays.asList(
                        new ChangelogVersionEntry("2.0.1", null, false, Arrays.asList(new ChangelogChangeEntry("note", "this is a newer prerelease"))),
                        new ChangelogVersionEntry("2.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "Next final release"))),
                        new ChangelogVersionEntry("1.0.0", null, true, Arrays.asList(new ChangelogChangeEntry("note", "Initial final release")))
                )));

        List<ChangelogVersionEntry> changesSince = testee.getChangesSinceCurrentVersion();

        assertEquals(1, changesSince.size());
        assertEquals("2.0.0", changesSince.get(0).getVersion());
    }


}
