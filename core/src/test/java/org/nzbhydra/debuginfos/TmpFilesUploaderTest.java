package org.nzbhydra.debuginfos;

import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Protocol;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import okio.Buffer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TmpFilesUploaderTest {

    @Mock
    private HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactoryMock;
    @Mock
    private OkHttpClient httpClientMock;
    @Mock
    private Call callMock;

    @InjectMocks
    private TmpFilesUploader testee = new TmpFilesUploader();

    private File file;

    @BeforeEach
    void setUp() throws Exception {
        file = File.createTempFile("nzbhydra-debug-infos", ".zip");
        file.deleteOnExit();
        Files.write(file.toPath(), "content".getBytes(StandardCharsets.UTF_8));
        when(clientHttpRequestFactoryMock.getOkHttpClient(anyString(), anyInt())).thenReturn(httpClientMock);
        when(httpClientMock.newCall(any())).thenReturn(callMock);
    }

    @Test
    void shouldReturnUrlFromResponse() throws Exception {
        respondWith(200, "{\"status\":\"success\",\"data\":{\"url\":\"https://tmpfiles.org/1234/file.zip\"}}");

        assertThat(testee.upload(file)).isEqualTo("https://tmpfiles.org/1234/file.zip");
    }

    @Test
    void shouldSendFileAndMaximumExpiryToUploadEndpoint() throws Exception {
        respondWith(200, "{\"status\":\"success\",\"data\":{\"url\":\"https://tmpfiles.org/1234/file.zip\"}}");

        testee.upload(file);

        final ArgumentCaptor<Request> captor = ArgumentCaptor.forClass(Request.class);
        verify(httpClientMock).newCall(captor.capture());
        final Request request = captor.getValue();
        assertThat(request.url().toString()).isEqualTo("https://tmpfiles.org/api/v1/upload");
        assertThat(request.method()).isEqualTo("POST");
        final Buffer buffer = new Buffer();
        request.body().writeTo(buffer);
        final String body = buffer.readUtf8();
        assertThat(body).contains("name=\"expire\"").contains("172800");
        assertThat(body).contains("name=\"file\"").contains("nzbhydra2-debug-infos.zip").contains("content");
    }

    @Test
    void shouldThrowWhenUploadFailed() throws Exception {
        respondWith(500, "Internal server error");

        assertThatThrownBy(() -> testee.upload(file))
            .isInstanceOf(IOException.class)
            .hasMessageContaining("500")
            .hasMessageContaining("Internal server error");
    }

    @Test
    void shouldThrowWhenResponseDoesNotContainUrl() throws Exception {
        respondWith(200, "{\"status\":\"error\",\"data\":{\"error\":\"File too large\"}}");

        assertThatThrownBy(() -> testee.upload(file))
            .isInstanceOf(IOException.class)
            .hasMessageContaining("File too large");
    }

    private void respondWith(int code, String body) throws IOException {
        final Request request = new Request.Builder().url("https://tmpfiles.org/api/v1/upload").build();
        final Response response = new Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(code)
            .message(code == 200 ? "OK" : "Error")
            .body(ResponseBody.create(body, MediaType.parse("application/json")))
            .build();
        when(callMock.execute()).thenReturn(response);
    }
}
