package org.nzbhydra.cache;

import org.nzbhydra.config.ConfigProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

/**
 * Issues and verifies the {@code cache/...} URLs served by {@link ProxyImagesWeb}.
 * <p>
 * Only URLs issued by Hydra itself may be fetched by the image proxy. Every issued URL carries an HMAC of the original
 * URL, keyed with a random secret generated at startup. Issued URLs only live as long as the search results or
 * autocomplete entries they're part of, so losing them on restart is acceptable.
 * <p>
 * Format: {@code cache/<base64url(originalUrl)>/<base64url(HmacSHA256(originalUrl))>}, both without padding.
 */
@Component
public class ProxyImageUrlSigner {

    public static final String PREFIX = "cache/";
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final SecretKeySpec key;

    @Autowired
    private ConfigProvider configProvider;

    public ProxyImageUrlSigner() {
        byte[] secret = new byte[32];
        new SecureRandom().nextBytes(secret);
        key = new SecretKeySpec(secret, HMAC_ALGORITHM);
    }

    /**
     * @return the proxied URL for the given image URL if image proxying is enabled, otherwise the original URL.
     */
    public String toProxiedUrlIfEnabled(String originalUrl) {
        if (originalUrl == null || !configProvider.getBaseConfig().getMain().isProxyImages()) {
            return originalUrl;
        }
        return issue(originalUrl);
    }

    /**
     * @return the signed, base-relative proxy URL for the given image URL.
     */
    public String issue(String originalUrl) {
        byte[] urlBytes = originalUrl.getBytes(StandardCharsets.UTF_8);
        return PREFIX + ENCODER.encodeToString(urlBytes) + "/" + ENCODER.encodeToString(sign(urlBytes));
    }

    /**
     * @param encodedUrl the encoded URL segment of an issued URL
     * @param signature  the signature segment of an issued URL
     * @return the original http(s) URL if the signature matches, otherwise empty
     */
    public Optional<URI> verify(String encodedUrl, String signature) {
        if (encodedUrl == null || signature == null) {
            return Optional.empty();
        }
        byte[] urlBytes;
        byte[] signatureBytes;
        try {
            urlBytes = DECODER.decode(encodedUrl);
            signatureBytes = DECODER.decode(signature);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
        if (!MessageDigest.isEqual(sign(urlBytes), signatureBytes)) {
            return Optional.empty();
        }
        try {
            URI uri = new URI(new String(urlBytes, StandardCharsets.UTF_8));
            String scheme = uri.getScheme();
            if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
                return Optional.empty();
            }
            return Optional.of(uri);
        } catch (URISyntaxException e) {
            return Optional.empty();
        }
    }

    private byte[] sign(byte[] urlBytes) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(key);
            return mac.doFinal(urlBytes);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Unable to compute image proxy URL signature", e);
        }
    }

}
