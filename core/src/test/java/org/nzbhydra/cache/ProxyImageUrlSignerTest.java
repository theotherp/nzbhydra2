package org.nzbhydra.cache;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ProxyImageUrlSignerTest {

    private static final String ORIGINAL_URL = "https://image.tmdb.org/t/p/w500/poster.jpg?a=b&c=d";

    private final BaseConfig baseConfig = new BaseConfig();
    private ProxyImageUrlSigner testee;

    @BeforeEach
    public void setUp() {
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        testee = new ProxyImageUrlSigner();
        ReflectionTestUtils.setField(testee, "configProvider", configProvider);
    }

    @Test
    void shouldIssueVerifiableUrl() {
        String issued = testee.issue(ORIGINAL_URL);

        assertThat(issued).matches("cache/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+");
        String[] segments = segments(issued);
        assertThat(testee.verify(segments[0], segments[1])).contains(URI.create(ORIGINAL_URL));
    }

    @Test
    void shouldRejectTamperedUrl() {
        String[] segments = segments(testee.issue(ORIGINAL_URL));
        String otherUrl = encode("http://127.0.0.1:5076/actuator/health");

        assertThat(testee.verify(otherUrl, segments[1])).isEmpty();
    }

    @Test
    void shouldRejectTamperedSignature() {
        String[] segments = segments(testee.issue(ORIGINAL_URL));
        char first = segments[1].charAt(0);
        String tamperedSignature = (first == 'A' ? 'B' : 'A') + segments[1].substring(1);

        assertThat(testee.verify(segments[0], tamperedSignature)).isEmpty();
        assertThat(testee.verify(segments[0], "")).isEmpty();
        assertThat(testee.verify(segments[0], "not base64!")).isEmpty();
        assertThat(testee.verify(segments[0], null)).isEmpty();
    }

    @Test
    void shouldRejectUrlsSignedByAnotherInstance() {
        String[] segments = segments(new ProxyImageUrlSigner().issue(ORIGINAL_URL));

        assertThat(testee.verify(segments[0], segments[1])).isEmpty();
    }

    @Test
    void shouldRejectNonHttpSchemesEvenWhenSigned() {
        String[] segments = segments(testee.issue("file:///etc/passwd"));

        assertThat(testee.verify(segments[0], segments[1])).isEmpty();
    }

    @Test
    void shouldOnlyProxyWhenEnabled() {
        baseConfig.getMain().setProxyImages(false);
        assertThat(testee.toProxiedUrlIfEnabled(ORIGINAL_URL)).isEqualTo(ORIGINAL_URL);

        baseConfig.getMain().setProxyImages(true);
        String proxied = testee.toProxiedUrlIfEnabled(ORIGINAL_URL);
        String[] segments = segments(proxied);
        assertThat(testee.verify(segments[0], segments[1])).contains(URI.create(ORIGINAL_URL));
        assertThat(testee.toProxiedUrlIfEnabled(null)).isNull();
    }

    static String[] segments(String issued) {
        assertThat(issued).startsWith(ProxyImageUrlSigner.PREFIX);
        return issued.substring(ProxyImageUrlSigner.PREFIX.length()).split("/");
    }

    private static String encode(String url) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(url.getBytes(StandardCharsets.UTF_8));
    }
}
