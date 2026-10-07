package org.nzbhydra.cache;

import com.google.common.hash.Hashing;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Serves images from indexers and media info providers through Hydra so that the browser doesn't contact them
 * directly. Only URLs issued by {@link ProxyImageUrlSigner} are fetched, and only (raster) images are returned.
 */
@RestController
public class ProxyImagesWeb {

    private static final Logger logger = LoggerFactory.getLogger(ProxyImagesWeb.class);

    static final int MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    /**
     * Raster formats only. SVG is excluded because it may contain scripts and would be served from Hydra's origin.
     */
    static final Set<String> ALLOWED_IMAGE_SUBTYPES = Set.of("jpeg", "pjpeg", "png", "gif", "webp", "avif", "bmp");
    private static final String CACHE_NAME = "images";

    private final HydraOkHttp3ClientHttpRequestFactory hydraOkHttp3ClientHttpRequestFactory;
    private final ProxyImageUrlSigner proxyImageUrlSigner;
    private final CacheManager imageCacheManager;

    public ProxyImagesWeb(HydraOkHttp3ClientHttpRequestFactory hydraOkHttp3ClientHttpRequestFactory,
                          ProxyImageUrlSigner proxyImageUrlSigner,
                          @Qualifier("imageCacheManager") CacheManager imageCacheManager) {
        this.hydraOkHttp3ClientHttpRequestFactory = hydraOkHttp3ClientHttpRequestFactory;
        this.proxyImageUrlSigner = proxyImageUrlSigner;
        this.imageCacheManager = imageCacheManager;
    }

    @GetMapping(value = "/cache/{encodedUrl}/{signature}")
    @Secured({"ROLE_USER"})
    public ResponseEntity<byte[]> proxyImage(@PathVariable String encodedUrl, @PathVariable String signature) {
        Optional<URI> verifiedUri = proxyImageUrlSigner.verify(encodedUrl, signature);
        if (verifiedUri.isEmpty()) {
            logger.debug("Rejecting image proxy request with invalid signature");
            return ResponseEntity.notFound().build();
        }
        URI uri = verifiedUri.get();
        Cache cache = imageCacheManager.getCache(CACHE_NAME);
        String cacheKey = Hashing.sha256().hashString(uri.toString(), StandardCharsets.UTF_8).toString();

        Optional<CachedImage> image = readFromCache(cache, cacheKey);
        if (image.isEmpty()) {
            image = fetchImage(uri);
            if (image.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }
            writeToCache(cache, cacheKey, image.get());
        }
        return ResponseEntity.ok()
            .contentType(image.get().contentType())
            .cacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePrivate())
            .header("X-Content-Type-Options", "nosniff")
            .body(image.get().body());
    }

    /**
     * Any failure reading or parsing an entry (e.g. it was evicted concurrently or is truncated) is treated as a miss.
     */
    private Optional<CachedImage> readFromCache(Cache cache, String cacheKey) {
        if (cache == null) {
            return Optional.empty();
        }
        Optional<CachedImage> image;
        try {
            Cache.ValueWrapper cached = cache.get(cacheKey);
            if (cached == null) {
                return Optional.empty();
            }
            image = cached.get() instanceof byte[] cachedBytes ? CachedImage.deserialize(cachedBytes) : Optional.empty();
        } catch (Exception e) {
            logger.debug("Image proxy: unable to read cache entry {}: {}", cacheKey, e.getMessage());
            image = Optional.empty();
        }
        if (image.isEmpty()) {
            try {
                cache.evict(cacheKey);
            } catch (Exception e) {
                logger.debug("Image proxy: unable to evict cache entry {}: {}", cacheKey, e.getMessage());
            }
        }
        return image;
    }

    private void writeToCache(Cache cache, String cacheKey, CachedImage image) {
        if (cache == null) {
            return;
        }
        try {
            cache.put(cacheKey, image.serialize());
        } catch (Exception e) {
            logger.debug("Image proxy: unable to write cache entry {}: {}", cacheKey, e.getMessage());
        }
    }

    private Optional<CachedImage> fetchImage(URI uri) {
        try (ClientHttpResponse response = hydraOkHttp3ClientHttpRequestFactory.createRequest(uri, HttpMethod.GET).execute()) {
            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.debug("Image proxy: upstream returned status {} for {}", response.getStatusCode(), uri);
                return Optional.empty();
            }
            MediaType contentType;
            try {
                contentType = response.getHeaders().getContentType();
            } catch (IllegalArgumentException e) {
                contentType = null;
            }
            if (!isAllowedImageType(contentType)) {
                logger.debug("Image proxy: upstream returned unsupported content type {} for {}", contentType, uri);
                return Optional.empty();
            }
            long contentLength = response.getHeaders().getContentLength();
            if (contentLength > MAX_IMAGE_SIZE_BYTES) {
                logger.debug("Image proxy: upstream image at {} too large ({} bytes)", uri, contentLength);
                return Optional.empty();
            }
            byte[] body;
            try (InputStream inputStream = response.getBody()) {
                body = inputStream.readNBytes(MAX_IMAGE_SIZE_BYTES + 1);
            }
            if (body.length > MAX_IMAGE_SIZE_BYTES) {
                logger.debug("Image proxy: upstream image at {} exceeds {} bytes", uri, MAX_IMAGE_SIZE_BYTES);
                return Optional.empty();
            }
            return Optional.of(new CachedImage(new MediaType(contentType.getType(), contentType.getSubtype()), body));
        } catch (IOException | RuntimeException e) {
            logger.debug("Image proxy: unable to load image from {}: {}", uri, e.getMessage());
            return Optional.empty();
        }
    }

    static boolean isAllowedImageType(MediaType contentType) {
        return contentType != null
            && "image".equalsIgnoreCase(contentType.getType())
            && ALLOWED_IMAGE_SUBTYPES.contains(contentType.getSubtype().toLowerCase());
    }

    /**
     * An image as stored in the disk cache: the content type, a space, the body length, a newline, then the body.
     * The length lets a truncated entry be detected.
     */
    record CachedImage(MediaType contentType, byte[] body) {

        byte[] serialize() {
            byte[] header = (contentType.toString() + " " + body.length + "\n").getBytes(StandardCharsets.US_ASCII);
            byte[] result = Arrays.copyOf(header, header.length + body.length);
            System.arraycopy(body, 0, result, header.length, body.length);
            return result;
        }

        static Optional<CachedImage> deserialize(byte[] bytes) {
            int newline = -1;
            for (int i = 0; i < Math.min(bytes.length, 100); i++) {
                if (bytes[i] == '\n') {
                    newline = i;
                    break;
                }
            }
            if (newline < 0) {
                return Optional.empty();
            }
            String header = new String(bytes, 0, newline, StandardCharsets.US_ASCII);
            int space = header.lastIndexOf(' ');
            if (space < 0) {
                return Optional.empty();
            }
            try {
                MediaType contentType = MediaType.parseMediaType(header.substring(0, space));
                int length = Integer.parseInt(header.substring(space + 1));
                if (!isAllowedImageType(contentType) || length != bytes.length - newline - 1) {
                    return Optional.empty();
                }
                return Optional.of(new CachedImage(contentType, Arrays.copyOfRange(bytes, newline + 1, bytes.length)));
            } catch (IllegalArgumentException e) {
                return Optional.empty();
            }
        }
    }

}
