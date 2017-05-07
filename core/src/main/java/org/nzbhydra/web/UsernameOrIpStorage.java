package org.nzbhydra.web;

public class UsernameOrIpStorage {

    public static final ThreadLocal<String> usernameOrIp =
            ThreadLocal.withInitial(() -> null);
    public static final ThreadLocal<String> ipForExternal =
            ThreadLocal.withInitial(() -> null);

}
