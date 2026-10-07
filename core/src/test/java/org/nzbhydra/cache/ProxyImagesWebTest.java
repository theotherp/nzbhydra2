package org.nzbhydra.cache;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.access.annotation.Secured;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.NoSuchFileException;
import java.util.Arrays;
import java.util.Base64;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ProxyImagesWebTest {

    private static final String IMAGE_URL = "https://example.com/poster.jpg";
    private static final byte[] IMAGE_BYTES = {(byte) 0x89, 'P', 'N', 'G', 1, 2, 3};

    @Mock
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;
    @Mock
    private ClientHttpRequest request;
    @Mock
    private ClientHttpResponse response;

    private ProxyImageUrlSigner signer;
    private ConcurrentMapCacheManager cacheManager;
    private ProxyImagesWeb testee;

    @BeforeEach
    public void setUp() {
        ConfigProvider configProvider = mock(ConfigProvider.class);
        lenient().when(configProvider.getBaseConfig()).thenReturn(new BaseConfig());
        signer = new ProxyImageUrlSigner();
        ReflectionTestUtils.setField(signer, "configProvider", configProvider);
        cacheManager = new ConcurrentMapCacheManager("images");
        testee = new ProxyImagesWeb(requestFactory, signer, cacheManager);
    }

    @Test
    void shouldRejectUnsignedRequestWithoutOutboundCall() {
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString("http://127.0.0.1:5076/actuator/health".getBytes(StandardCharsets.UTF_8));

        ResponseEntity<byte[]> result = testee.proxyImage(encoded, "AAAA");

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(result.getBody()).isNull();
        verifyNoInteractions(requestFactory);
    }

    @Test
    void shouldRejectForgedRequestWithoutOutboundCall() {
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));
        String forgedUrl = Base64.getUrlEncoder().withoutPadding().encodeToString("http://169.254.169.254/latest/meta-data/".getBytes(StandardCharsets.UTF_8));

        ResponseEntity<byte[]> result = testee.proxyImage(forgedUrl, issued[1]);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verifyNoInteractions(requestFactory);
    }

    @Test
    void shouldServeSignedImageWithUpstreamContentTypeAndCacheIt() throws Exception {
        mockUpstream(HttpStatus.OK, "image/png", IMAGE_BYTES);
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        ResponseEntity<byte[]> result = testee.proxyImage(issued[0], issued[1]);
        ResponseEntity<byte[]> cachedResult = testee.proxyImage(issued[0], issued[1]);

        for (ResponseEntity<byte[]> entity : new ResponseEntity[]{result, cachedResult}) {
            assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
            assertThat(entity.getHeaders().getContentType()).isEqualTo(MediaType.IMAGE_PNG);
            assertThat(entity.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
            assertThat(entity.getBody()).isEqualTo(IMAGE_BYTES);
        }
        verify(requestFactory, times(1)).createRequest(URI.create(IMAGE_URL), HttpMethod.GET);
    }

    @Test
    void shouldNotReturnOrCacheNonImageResponses() throws Exception {
        mockUpstream(HttpStatus.OK, "application/json", "{\"status\":\"UP\"}".getBytes(StandardCharsets.UTF_8));
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        assertThat(testee.proxyImage(issued[0], issued[1]).getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(testee.proxyImage(issued[0], issued[1]).getBody()).isNull();
        verify(requestFactory, times(2)).createRequest(any(), any());
    }

    @Test
    void shouldNotReturnSvg() throws Exception {
        mockUpstream(HttpStatus.OK, "image/svg+xml", "<svg onload='alert(1)'/>".getBytes(StandardCharsets.UTF_8));
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        assertThat(testee.proxyImage(issued[0], issued[1]).getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void shouldNotReturnOrCacheNonSuccessfulResponses() throws Exception {
        mockUpstream(HttpStatus.NOT_FOUND, "image/png", IMAGE_BYTES);
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        assertThat(testee.proxyImage(issued[0], issued[1]).getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(testee.proxyImage(issued[0], issued[1]).getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        verify(requestFactory, times(2)).createRequest(any(), any());
    }

    @Test
    void shouldRejectTooLargeImages() throws Exception {
        mockUpstream(HttpStatus.OK, "image/jpeg", new byte[ProxyImagesWeb.MAX_IMAGE_SIZE_BYTES + 1]);
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        assertThat(testee.proxyImage(issued[0], issued[1]).getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void shouldAcceptImageAtSizeLimit() throws Exception {
        mockUpstream(HttpStatus.OK, "image/jpeg", new byte[ProxyImagesWeb.MAX_IMAGE_SIZE_BYTES]);
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        ResponseEntity<byte[]> result = testee.proxyImage(issued[0], issued[1]);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).hasSize(ProxyImagesWeb.MAX_IMAGE_SIZE_BYTES);
    }

    @Test
    void shouldRequireUserRole() throws Exception {
        Secured secured = ProxyImagesWeb.class.getMethod("proxyImage", String.class, String.class).getAnnotation(Secured.class);

        assertThat(secured).isNotNull();
        assertThat(secured.value()).containsExactly("ROLE_USER");
    }

    @Test
    void shouldTreatTruncatedCacheEntryAsMissAndRefetch() throws Exception {
        mockUpstream(HttpStatus.OK, "image/png", IMAGE_BYTES);
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));
        testee.proxyImage(issued[0], issued[1]);
        Cache cache = cacheManager.getCache("images");
        String cacheKey = (String) ((Map<?, ?>) cache.getNativeCache()).keySet().iterator().next();
        byte[] stored = (byte[]) cache.get(cacheKey).get();
        cache.put(cacheKey, Arrays.copyOf(stored, stored.length - 2));

        ResponseEntity<byte[]> result = testee.proxyImage(issued[0], issued[1]);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isEqualTo(IMAGE_BYTES);
        verify(requestFactory, times(2)).createRequest(any(), any());
        assertThat((byte[]) cache.get(cacheKey).get()).isEqualTo(stored);
    }

    @Test
    void shouldTreatCacheReadFailureAsMissAndRefetch() throws Exception {
        mockUpstream(HttpStatus.OK, "image/png", IMAGE_BYTES);
        Cache cache = mock(Cache.class);
        // DiskCache is @SneakyThrows: a file evicted between exists() and readAllBytes() surfaces as this checked exception
        doAnswer(invocation -> {
            throw new NoSuchFileException("evicted");
        }).when(cache).get(anyString());
        doAnswer(invocation -> {
            throw new NoSuchFileException("evicted");
        }).when(cache).evict(anyString());
        CacheManager failingCacheManager = mock(CacheManager.class);
        when(failingCacheManager.getCache("images")).thenReturn(cache);
        testee = new ProxyImagesWeb(requestFactory, signer, failingCacheManager);
        String[] issued = ProxyImageUrlSignerTest.segments(signer.issue(IMAGE_URL));

        ResponseEntity<byte[]> result = testee.proxyImage(issued[0], issued[1]);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isEqualTo(IMAGE_BYTES);
        verify(requestFactory, times(1)).createRequest(any(), any());
    }

    @Test
    void shouldRoundTripCachedImageAndRejectMalformedEntries() {
        ProxyImagesWeb.CachedImage image = new ProxyImagesWeb.CachedImage(MediaType.IMAGE_PNG, IMAGE_BYTES);
        byte[] serialized = image.serialize();

        assertThat(ProxyImagesWeb.CachedImage.deserialize(serialized)).hasValueSatisfying(deserialized -> {
            assertThat(deserialized.contentType()).isEqualTo(MediaType.IMAGE_PNG);
            assertThat(deserialized.body()).isEqualTo(IMAGE_BYTES);
        });
        assertThat(ProxyImagesWeb.CachedImage.deserialize(Arrays.copyOf(serialized, serialized.length - 1))).isEmpty();
        assertThat(ProxyImagesWeb.CachedImage.deserialize(Arrays.copyOf(serialized, serialized.length + 1))).isEmpty();
        assertThat(ProxyImagesWeb.CachedImage.deserialize(new byte[0])).isEmpty();
        assertThat(ProxyImagesWeb.CachedImage.deserialize("image/png\n123".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(ProxyImagesWeb.CachedImage.deserialize("text/html 3\nabc".getBytes(StandardCharsets.US_ASCII))).isEmpty();
        assertThat(ProxyImagesWeb.CachedImage.deserialize("image/png x\nabc".getBytes(StandardCharsets.US_ASCII))).isEmpty();
    }

    private void mockUpstream(HttpStatus status, String contentType, byte[] body) throws Exception {
        when(requestFactory.createRequest(any(), any())).thenReturn(request);
        when(request.execute()).thenReturn(response);
        when(response.getStatusCode()).thenReturn(status);
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.CONTENT_TYPE, contentType);
        lenient().when(response.getHeaders()).thenReturn(headers);
        lenient().when(response.getBody()).thenAnswer(invocation -> new ByteArrayInputStream(body));
    }
}
