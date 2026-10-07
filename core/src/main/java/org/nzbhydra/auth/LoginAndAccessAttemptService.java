package org.nzbhydra.auth;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.net.InetAddresses;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

//Mostly taken from http://www.baeldung.com/spring-security-block-brute-force-authentication-attempts
@Component
public class LoginAndAccessAttemptService {

    private static final Logger logger = LoggerFactory.getLogger(LoginAndAccessAttemptService.class);
    private final int MAX_ATTEMPTS = 5;
    private final LoadingCache<String, Integer> attemptsCache;

    public LoginAndAccessAttemptService() {
        attemptsCache = CacheBuilder.newBuilder().expireAfterWrite(1, TimeUnit.DAYS).build(new CacheLoader<>() {
            @Override
            public Integer load(String key) throws Exception {
                return 0;
            }
        });
    }

    public void accessSucceeded(String ipOrHost) {
        String key = toKey(ipOrHost);
        if (key == null) {
            logger.warn("Unable to log successul login by empty IP/host");
            return;
        }
        attemptsCache.invalidate(key);
    }

    public void accessFailed(String ipOrHost) {
        String key = toKey(ipOrHost);
        synchronized (attemptsCache) {
            if (key == null) {
                logger.warn("Unable to log failed login by empty IP/host");
                return;
            }
            int attempts = attemptsCache.getUnchecked(key);
            attempts++;
            attemptsCache.put(key, attempts);
            logger.warn("{} failed access attempts from IP/host {} in the last 24 hours. Will block access after {} failed attempts", attempts, key, MAX_ATTEMPTS);
        }
    }

    public boolean isBlocked(String ipOrHost) {
        String key = toKey(ipOrHost);
        if (key == null) {
            return false;
        }
        return attemptsCache.getUnchecked(key) >= MAX_ATTEMPTS;
    }

    public boolean wasUnsuccessfulBefore(String ipOrHost) {
        String key = toKey(ipOrHost);
        if (key == null) {
            logger.warn("Unable to determine unsuccessul login by empty IP/host. Will assume this access is OK");
            return true;
        }
        return attemptsCache.getUnchecked(key) > 0;
    }

    /**
     * IPv6 addresses are counted per /64 prefix: a single host or network usually gets a whole /64 and could
     * otherwise rotate through its addresses to get unlimited attempts. IPv4 addresses and anything else are used as
     * they are.
     */
    static String toKey(String ipOrHost) {
        if (ipOrHost == null) {
            return null;
        }
        String address = ipOrHost.trim();
        if (address.startsWith("[") && address.endsWith("]")) {
            address = address.substring(1, address.length() - 1);
        }
        int zoneIndex = address.indexOf('%');
        if (zoneIndex > 0) {
            address = address.substring(0, zoneIndex);
        }
        if (!address.contains(":") || !InetAddresses.isInetAddress(address)) {
            return ipOrHost;
        }
        InetAddress inetAddress = InetAddresses.forString(address);
        if (!(inetAddress instanceof Inet6Address)) {
            //IPv4-mapped IPv6 address
            return inetAddress.getHostAddress();
        }
        byte[] bytes = inetAddress.getAddress();
        Arrays.fill(bytes, 8, 16, (byte) 0);
        try {
            return InetAddresses.toAddrString(InetAddress.getByAddress(bytes)) + "/64";
        } catch (UnknownHostException e) {
            //Can't happen for a 16 byte array
            return ipOrHost;
        }
    }
}
