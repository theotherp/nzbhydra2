package org.nzbhydra.update;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import org.junit.Before;
import org.junit.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.nzbhydra.genericstorage.GenericStorage;
import org.nzbhydra.mapping.SemanticVersion;
import org.nzbhydra.mapping.changelog.ChangelogChangeEntry;
import org.nzbhydra.mapping.changelog.ChangelogVersionEntry;
import org.nzbhydra.mapping.github.Release;
import org.nzbhydra.okhttp.WebAccess;
import org.nzbhydra.update.UpdateManager.BlockedVersion;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.List;

import static junit.framework.TestCase.assertTrue;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.when;

@SuppressWarnings("unchecked")
public class UpdateManagerTest {

    @Mock
    private GenericStorage updateDataGenericStorageMock;
    @Mock
    private RestTemplate restTemplateMock;
    @Mock
    private WebAccess webAccessMock;

    private static String changelog = "some changes";

    @InjectMocks
    private UpdateManager testee = new UpdateManager();

    @Before
    public void setUp() throws Exception {
        MockitoAnnotations.initMocks(this);
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);

        testee.currentVersionString = "1.0.0";
        testee.repositoryBaseUrl = "http:/127.0.0.1:7070/repos/theotherp/apitests";
        testee.changelogUrl = "http:/127.0.0.1:7070/changelog";
        testee.blockedVersionsUrl = "http:/127.0.0.1:7070/blockedVersions.json";
        testee.afterPropertiesSet();

        Release latestRelease = new Release();
        latestRelease.setTagName("v2.0.0");
        latestRelease.setBody("Some new stuff");

        Release previousRelease = new Release();
        previousRelease.setTagName("v1.0.0");
        previousRelease.setBody("A list:\n" +
                "* a\n" +
                "* b");

        when(restTemplateMock.getForEntity(startsWith("http:/127.0.0.1:7070/repos/theotherp/apitests/releases/latest"), any())).thenReturn(
                new ResponseEntity<>(latestRelease, HttpStatus.OK)
        );

        //Return in wrong order to test sorting of releases by version
        when(restTemplateMock.getForEntity(eq("http:/127.0.0.1:7070/repos/theotherp/apitests/releases"), any())).thenReturn(
                new ResponseEntity<>(
                        Arrays.asList(previousRelease, latestRelease), HttpStatus.OK)
        );


        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/changelog"), any(TypeReference.class))).thenReturn(
                Arrays.asList(
                        new ChangelogVersionEntry("3.0.0", Arrays.asList(new ChangelogChangeEntry("note", "a note"))),
                        new ChangelogVersionEntry("2.0.0", Arrays.asList(new ChangelogChangeEntry("fix", "a minor fix"))),
                        new ChangelogVersionEntry("0.0.1", Arrays.asList(new ChangelogChangeEntry("feature", "a new feature")))

                ));

        when(webAccessMock.callUrl(eq("http:/127.0.0.1:7070/blockedVersions.json"), any(TypeReference.class))).thenReturn(
                Arrays.asList(new BlockedVersion("3.0.0", "comment"))
        );
    }


    @Test
    public void testThatChecksForUpdateAvailable() throws Exception {
        assertTrue(testee.isUpdateAvailable());
        testee.currentVersion = new SemanticVersion("v2.0.0");
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
    public void shouldGetChangesSince() throws Exception {
        List<ChangelogVersionEntry> changesSince = testee.getChangesSinceCurrentVersion();

        assertEquals(2, changesSince.size());
        assertEquals("3.0.0", changesSince.get(0).getVersion());
        assertEquals("2.0.0", changesSince.get(1).getVersion());
    }

    @Test
    public void shouldGetAllChanges() throws Exception {
        List<ChangelogVersionEntry> changesSince = testee.getAllChanges();

        assertEquals(3, changesSince.size());
        assertEquals("3.0.0", changesSince.get(0).getVersion());
        assertEquals("2.0.0", changesSince.get(1).getVersion());
        assertEquals("0.0.1", changesSince.get(2).getVersion());
    }


}