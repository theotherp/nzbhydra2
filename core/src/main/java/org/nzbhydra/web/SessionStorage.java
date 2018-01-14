package org.nzbhydra.web;

import org.springframework.web.util.UriComponentsBuilder;

public class SessionStorage {

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
        return urlBuilder.get().cloneBuilder();
    }

    public static void setUrlBuilder(UriComponentsBuilder builder) {
        urlBuilder.set(builder);
    }

}
