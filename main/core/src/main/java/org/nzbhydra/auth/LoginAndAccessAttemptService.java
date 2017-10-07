package org.nzbhydra.auth;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

//Mostly taken from http://www.baeldung.com/spring-security-block-brute-force-authentication-attempts
@Component
public class LoginAndAccessAttemptService {

    private static final Logger logger = LoggerFactory.getLogger(LoginAndAccessAttemptService.class);
    private final int MAX_ATTEMPTS = 5;
    private final LoadingCache<String, Integer> attemptsCache;

    public LoginAndAccessAttemptService() {
        attemptsCache = CacheBuilder.newBuilder().expireAfterWrite(1, TimeUnit.DAYS).build(new CacheLoader<String, Integer>() {
            @Override
            public Integer load(String key) throws Exception {
                return 0;
            }
        });
    }

    public void accessSucceeded(String key) {
        attemptsCache.invalidate(key);
    }

    public void accessFailed(String key) {
        synchronized (attemptsCache) {
            int attempts = attemptsCache.getUnchecked(key);
            attempts++;
            attemptsCache.put(key, attempts);
            logger.warn("{} failed access attempts from IP {} in the last 24 hours. Will block access at {} failed attempts", attempts, SessionStorage.IP.get(), MAX_ATTEMPTS);
        }
    }

    public boolean isBlocked(String key) {
        return attemptsCache.getUnchecked(key) >= MAX_ATTEMPTS;
    }

    public boolean wasUnsuccessfulBefore(String key) {
        return attemptsCache.getUnchecked(key) > 0;
    }
}
