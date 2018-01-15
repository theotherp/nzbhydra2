package org.nzbhydra.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.util.UriComponentsBuilder;

public class SessionStorage {

    private static final Logger logger = LoggerFactory.getLogger(SessionStorage.class);

    public static final ThreadLocal<String> username =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> IP =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> userAgent =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> requestUrl =
            ThreadLocal.withInitial(() -> null);
    private static ThreadLocal<UriComponentsBuilder> urlBuilder =
            ThreadLocal.withInitial(() -> null);

    public static UriComponentsBuilder getUrlBuilder() {
        if (urlBuilder.get() == null) {
            logger.warn("Returning URL builder for 127.0.0.1");
            return UriComponentsBuilder.fromHttpUrl("http://127.0.0.1"); //May be the case in tests
        }
        return urlBuilder.get().cloneBuilder();
    }

    public static void setUrlBuilder(UriComponentsBuilder builder) {
        urlBuilder.set(builder);
    }

}
