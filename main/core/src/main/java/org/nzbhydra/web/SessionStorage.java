package org.nzbhydra.web;

public class SessionStorage {

    public static final ThreadLocal<String> usernameOrIp =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> IP =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> userAgent =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> requestUrl =
            ThreadLocal.withInitial(() -> null);

}
