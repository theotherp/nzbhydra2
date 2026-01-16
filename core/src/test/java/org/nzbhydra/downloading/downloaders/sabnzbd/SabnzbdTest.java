

package org.nzbhydra.downloading.downloaders.sabnzbd;

import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SabnzbdTest {

    @Mock
    private FileHandler fileHandler;
    @Mock
    private SearchResultRepository searchResultRepository;
    @Mock
    private ApplicationEventPublisher applicationEventPublisher;
    @Mock
    private IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions;
    @Mock
    private ConfigProvider configProvider;
    @Mock
    private RestTemplate restTemplate;
    @Mock
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Mock
    private DownloadUrlBuilder downloadUrlBuilder;
    @Mock
    private OkHttpClient okHttpClient;
    @Mock
    private Call call;

    private Sabnzbd sabnzbd;

    @BeforeEach
    void setUp() {
        sabnzbd = new Sabnzbd(fileHandler, searchResultRepository, applicationEventPublisher,
                indexerSpecificDownloadExceptions, configProvider, restTemplate, requestFactory, downloadUrlBuilder);
    }

    @Test
    void shouldParseDurationStringToSeconds() {
        assertThat(Sabnzbd.durationStringToSeconds("01:01:01")).isEqualTo(3661);
        assertThat(Sabnzbd.durationStringToSeconds("01:01")).isEqualTo(61);
    }

    @Test
    void shouldSendMultipartFormDataContentType() throws Exception {
        // Given
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setUrl("http://localhost:8080/sabnzbd");
        downloaderConfig.setApiKey("testApiKey");
        sabnzbd.initialize(downloaderConfig);

        when(requestFactory.getOkHttpClient(any(String.class))).thenReturn(okHttpClient);
        when(okHttpClient.newCall(any(Request.class))).thenReturn(call);

        String jsonResponse = "{\"status\": true, \"nzo_ids\": [\"SABnzbd_nzo_12345\"]}";
        Response response = new Response.Builder()
                .request(new Request.Builder().url("http://localhost:8080/sabnzbd/api").build())
                .protocol(Protocol.HTTP_1_1)
                .code(200)
                .message("OK")
                .body(ResponseBody.create(jsonResponse, okhttp3.MediaType.parse("application/json")))
                .build();
        when(call.execute()).thenReturn(response);

        byte[] nzbContent = "<nzb>test content</nzb>".getBytes();

        // When
        String nzoId = sabnzbd.addContent(nzbContent, "Test NZB", DownloadType.NZB, null);

        // Then
        assertThat(nzoId).isEqualTo("SABnzbd_nzo_12345");

        ArgumentCaptor<Request> requestCaptor = ArgumentCaptor.forClass(Request.class);
        verify(okHttpClient).newCall(requestCaptor.capture());

        Request capturedRequest = requestCaptor.getValue();
        String contentType = capturedRequest.body().contentType().toString();
        assertThat(contentType).startsWith("multipart/form-data");
    }

}