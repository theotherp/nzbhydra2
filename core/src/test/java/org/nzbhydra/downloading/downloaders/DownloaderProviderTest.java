package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.DownloaderType;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DownloaderProviderTest {

    private static final String UNCHANGED = "***UNCHANGED***";

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private DownloaderInstatiator downloaderInstatiator;
    @Mock
    private Downloader downloader;

    @InjectMocks
    private DownloaderProvider testee;

    private BaseConfig baseConfig;

    @BeforeEach
    void setUp() {
        baseConfig = new BaseConfig();
        final DownloaderConfig stored = downloaderConfig("SABnzbd", "http://localhost:8070", "storedApiKey", "storedUser", "storedPassword");
        stored.setId("id-sab");
        final DownloaderConfig other = downloaderConfig("Other", "http://localhost:8071", "otherApiKey", "otherUser", "otherPassword");
        other.setId("id-other");
        baseConfig.getDownloading().setDownloaders(new ArrayList<>(List.of(stored, other)));
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
    }

    @Test
    void shouldUseStoredCredentialsWhenCheckingConnectionWithUnchangedMarkers() {
        when(downloaderInstatiator.instantiate(DownloaderType.SABNZBD)).thenReturn(downloader);
        when(downloader.checkConnection()).thenReturn(GenericResponse.ok());

        //Renamed in the dialog to the name of the other downloader: the id still says which one it is
        final DownloaderConfig submitted = downloaderConfig("Other", "http://localhost:8086", UNCHANGED, UNCHANGED, UNCHANGED);
        submitted.setId("id-sab");
        GenericResponse response = testee.checkConnection(submitted);

        assertThat(response.isSuccessful()).isTrue();
        ArgumentCaptor<DownloaderConfig> captor = ArgumentCaptor.forClass(DownloaderConfig.class);
        verify(downloader).initialize(captor.capture());
        DownloaderConfig checked = captor.getValue();
        assertThat(checked.getUrl()).isEqualTo("http://localhost:8086");
        assertThat(checked.getApiKey()).isEqualTo("storedApiKey");
        assertThat(checked.getUsername()).contains("storedUser");
        assertThat(checked.getPassword()).contains("storedPassword");
    }

    @Test
    void shouldKeepEnteredCredentialsWhenCheckingConnection() {
        when(downloaderInstatiator.instantiate(DownloaderType.SABNZBD)).thenReturn(downloader);
        when(downloader.checkConnection()).thenReturn(GenericResponse.ok());

        //Without an id (e.g. an API client) the downloader is identified by its name
        testee.checkConnection(downloaderConfig("SABnzbd", "http://localhost:8086", "newApiKey", UNCHANGED, null));

        ArgumentCaptor<DownloaderConfig> captor = ArgumentCaptor.forClass(DownloaderConfig.class);
        verify(downloader).initialize(captor.capture());
        assertThat(captor.getValue().getApiKey()).isEqualTo("newApiKey");
        assertThat(captor.getValue().getUsername()).contains("storedUser");
        assertThat(captor.getValue().getPassword()).isEmpty();
    }

    @Test
    void shouldNotContactDownloaderWhenUnchangedMarkerCannotBeResolved() {
        GenericResponse response = testee.checkConnection(downloaderConfig("Renamed", "http://localhost:8086", UNCHANGED, null, null));

        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).contains("Please enter the API key again");
        verify(downloaderInstatiator, never()).instantiate(any());
    }

    @Test
    void shouldNotContactDownloaderWhenItsIdIsUnknown() {
        //The name matches a stored downloader, but a record with an id is matched by its id only
        final DownloaderConfig submitted = downloaderConfig("SABnzbd", "http://localhost:8086", UNCHANGED, UNCHANGED, UNCHANGED);
        submitted.setId("id-deleted");

        GenericResponse response = testee.checkConnection(submitted);

        assertThat(response.isSuccessful()).isFalse();
        assertThat(response.getMessage()).contains("Please enter the API key, username and password again");
        verify(downloaderInstatiator, never()).instantiate(any());
    }

    @Test
    void shouldUseTheOwnCredentialsOfDownloadersWithEqualNames() {
        baseConfig.getDownloading().getDownloaders().get(1).setName("SABnzbd");
        when(downloaderInstatiator.instantiate(DownloaderType.SABNZBD)).thenReturn(downloader);
        when(downloader.checkConnection()).thenReturn(GenericResponse.ok());
        final DownloaderConfig submitted = downloaderConfig("SABnzbd", "http://localhost:8071", UNCHANGED, UNCHANGED, UNCHANGED);
        submitted.setId("id-other");

        testee.checkConnection(submitted);

        ArgumentCaptor<DownloaderConfig> captor = ArgumentCaptor.forClass(DownloaderConfig.class);
        verify(downloader).initialize(captor.capture());
        assertThat(captor.getValue().getApiKey()).isEqualTo("otherApiKey");
        assertThat(captor.getValue().getPassword()).contains("otherPassword");
    }

    private static DownloaderConfig downloaderConfig(String name, String url, String apiKey, String username, String password) {
        DownloaderConfig config = new DownloaderConfig();
        config.setName(name);
        config.setDownloaderType(DownloaderType.SABNZBD);
        config.setUrl(url);
        config.setApiKey(apiKey);
        config.setUsername(username);
        config.setPassword(password);
        return config;
    }
}
