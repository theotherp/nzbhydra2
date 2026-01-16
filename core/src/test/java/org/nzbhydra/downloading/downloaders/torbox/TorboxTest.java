

package org.nzbhydra.downloading.downloaders.torbox;

import lombok.SneakyThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.backup.BackupTask;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import org.springframework.web.client.RestTemplate;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(SpringExtension.class)
@SpringBootTest(classes = NzbHydra.class)
@Disabled
class TorboxTest {

    @Autowired
    private Torbox torbox;
    @MockBean
    private BackupTask backupTask;
    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory hydraOkHttp3ClientHttpRequestFactory;
    @Autowired
    private RestTemplate restTemplate;

    @BeforeEach
    public void setUp() {
        torbox.initialize(DownloaderConfig.builder().apiKey(System.getProperty("TORBOX_API_KEY")).build());
    }

    @Test
    void shouldCheckConnection() {
        GenericResponse response = torbox.checkConnection();

        assertThat(response.isSuccessful()).isTrue();
        assertThat(response.getMessage()).isNull();
    }

    @Test
    void shouldAddLink() throws DownloaderException {
        String nzbLink = "https://example.com/test.nzb";
        String title = "Test NZB";
        String category = null;

        String downloadId = torbox.addLink(nzbLink, title, DownloadType.NZB, category);

        assertThat(downloadId).isNotEmpty();
    }

    @Test
    @SneakyThrows
    void shouldAddData() throws DownloaderException {
        byte[] data = Files.readAllBytes(Path.of("c:\\temp\\Northern.Papa.S20E07.480p.x264-mSD.nzb"));
        String title = "Test NZB";
        String category = null;

        String downloadId = torbox.addContent(data, title, DownloadType.NZB, category);

        assertThat(downloadId).isNotEmpty();
    }


}