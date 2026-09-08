

package org.nzbhydra.downloading.downloaders.sabnzbd;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
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
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

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
        assertThat(capturedRequest.header("User-Agent")).isEqualTo("NZBHydra2");
    }

    @Test
    void shouldFallBackToOfflineStatusAndLogTheErrorOnlyOncePerThrottleWindow() throws Exception {
        class FailingSabnzbd extends Sabnzbd {
            FailingSabnzbd(HydraOkHttp3ClientHttpRequestFactory requestFactory) {
                super(null, null, null, null, null, null, requestFactory, null);
            }

            @Override
            protected <T> T callSabnzb(java.net.URI uri, Class<T> responseType) throws DownloaderException {
                throw new DownloaderException("downloader is offline");
            }

            List<Long> recordedRates() {
                return getDownloadRates();
            }
        }
        FailingSabnzbd failing = new FailingSabnzbd(requestFactory);
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setUrl("http://localhost:8080/sabnzbd");
        downloaderConfig.setName("sabnzbd");
        failing.initialize(downloaderConfig);
        ListAppender<ILoggingEvent> logAppender = new ListAppender<>();
        logAppender.start();
        Logger sabnzbdLogger = (Logger) LoggerFactory.getLogger(Sabnzbd.class);
        sabnzbdLogger.addAppender(logAppender);
        try {
            DownloaderStatus first = failing.getStatus();
            DownloaderStatus second = failing.getStatus();

            assertThat(first.getState()).isEqualTo(DownloaderStatus.State.OFFLINE);
            assertThat(second.getState()).isEqualTo(DownloaderStatus.State.OFFLINE);
            assertThat(failing.recordedRates()).containsExactly(0L, 0L);
            assertThat(logAppender.list.stream()
                    .filter(x -> x.getLevel() == Level.ERROR)
                    .filter(x -> "Error contacting sabnzbd".equals(x.getMessage()))
                    .toList()).hasSize(1);
        } finally {
            sabnzbdLogger.detachAppender(logAppender);
            logAppender.stop();
        }
    }

    @Test
    void shouldSendUserAgentHeaderOnRestTemplateCalls() throws Exception {
        RestTemplate internalRestTemplate = (RestTemplate) ReflectionTestUtils.getField(sabnzbd, "restTemplate");

        ClientHttpRequest clientHttpRequest = mock(ClientHttpRequest.class);
        ClientHttpResponse clientHttpResponse = mock(ClientHttpResponse.class);
        HttpHeaders responseHeaders = new HttpHeaders();
        responseHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpHeaders requestHeaders = new HttpHeaders();

        when(clientHttpRequest.getHeaders()).thenReturn(requestHeaders);
        when(clientHttpRequest.execute()).thenReturn(clientHttpResponse);
        when(clientHttpResponse.getStatusCode()).thenReturn(HttpStatus.OK);
        when(clientHttpResponse.getHeaders()).thenReturn(responseHeaders);
        when(clientHttpResponse.getBody()).thenReturn(new ByteArrayInputStream("{\"categories\":[]}".getBytes()));

        ClientHttpRequestFactory delegateFactory = mock(ClientHttpRequestFactory.class);
        when(delegateFactory.createRequest(any(), any())).thenReturn(clientHttpRequest);
        internalRestTemplate.setRequestFactory(delegateFactory);

        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setUrl("http://localhost:8080/sabnzbd");
        sabnzbd.initialize(downloaderConfig);

        sabnzbd.getCategories();

        assertThat(requestHeaders.getFirst("User-Agent")).isEqualTo("NZBHydra2");
    }

}
