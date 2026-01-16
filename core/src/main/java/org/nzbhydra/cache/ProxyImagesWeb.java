

package org.nzbhydra.cache;

import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@RestController
public class ProxyImagesWeb {

    private final HydraOkHttp3ClientHttpRequestFactory hydraOkHttp3ClientHttpRequestFactory;

    public ProxyImagesWeb(HydraOkHttp3ClientHttpRequestFactory hydraOkHttp3ClientHttpRequestFactory) {
        this.hydraOkHttp3ClientHttpRequestFactory = hydraOkHttp3ClientHttpRequestFactory;
    }

    @RequestMapping(value = "/cache/{originalUrl}", method = RequestMethod.GET, produces = MediaType.IMAGE_JPEG_VALUE)
    @Cacheable(cacheNames = "images", cacheManager = "imageCacheManager")
    public byte[] proxyImage(@PathVariable String originalUrl) throws Exception {
        try (ClientHttpResponse response = hydraOkHttp3ClientHttpRequestFactory.createRequest(new URI(new String(Base64.getDecoder().decode(originalUrl), StandardCharsets.UTF_8)), HttpMethod.GET).execute()) {
            return response.getBody().readAllBytes();
        }
    }

}
