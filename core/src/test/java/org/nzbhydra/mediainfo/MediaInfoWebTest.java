package org.nzbhydra.mediainfo;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.cache.ProxyImageUrlSigner;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.springframework.test.util.ReflectionTestUtils;

import java.net.URI;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class MediaInfoWebTest {

    private static final String POSTER_URL = "https://image.tmdb.org/t/p/w500/poster.jpg";

    private final BaseConfig baseConfig = new BaseConfig();
    private final ProxyImageUrlSigner signer = new ProxyImageUrlSigner();
    private final MediaInfoWeb testee = new MediaInfoWeb();

    @BeforeEach
    public void setUp() throws Exception {
        ConfigProvider configProvider = mock(ConfigProvider.class);
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        ReflectionTestUtils.setField(signer, "configProvider", configProvider);

        InfoProvider infoProvider = mock(InfoProvider.class);
        MediaInfo mediaInfo = new MediaInfo();
        mediaInfo.setTitle("Movie");
        mediaInfo.setPosterUrl(POSTER_URL);
        when(infoProvider.search("movie", MediaIdType.MOVIETITLE)).thenReturn(List.of(mediaInfo));

        ReflectionTestUtils.setField(testee, "infoProvider", infoProvider);
        ReflectionTestUtils.setField(testee, "configProvider", configProvider);
        ReflectionTestUtils.setField(testee, "proxyImageUrlSigner", signer);
    }

    @Test
    void shouldIssueVerifiableProxiedPosterUrlsWhenProxyingIsEnabled() throws Exception {
        baseConfig.getMain().setProxyImages(true);

        List<MediaInfoTO> first = testee.autocomplete(AutocompleteType.MOVIE, "movie");
        List<MediaInfoTO> second = testee.autocomplete(AutocompleteType.MOVIE, "movie");

        for (List<MediaInfoTO> tos : List.of(first, second)) {
            assertThat(tos).hasSize(1);
            assertThat(tos.get(0).getTitle()).isEqualTo("Movie");
            String posterUrl = tos.get(0).getPosterUrl();
            assertThat(posterUrl).startsWith("cache/");
            String[] segments = posterUrl.substring("cache/".length()).split("/");
            assertThat(signer.verify(segments[0], segments[1])).contains(URI.create(POSTER_URL));
        }
    }

    @Test
    void shouldReturnOriginalPosterUrlsWhenProxyingIsDisabled() throws Exception {
        baseConfig.getMain().setProxyImages(true);
        testee.autocomplete(AutocompleteType.MOVIE, "movie");
        baseConfig.getMain().setProxyImages(false);

        List<MediaInfoTO> tos = testee.autocomplete(AutocompleteType.MOVIE, "movie");

        assertThat(tos.get(0).getPosterUrl()).isEqualTo(POSTER_URL);
    }
}
