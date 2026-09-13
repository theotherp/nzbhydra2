/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.searching;

import org.nzbhydra.web.SessionStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@RestController
public class DemoModeWeb {

    private static final Logger logger = LoggerFactory.getLogger(DemoModeWeb.class);

    private static final Set<String> usersInDemoMode = ConcurrentHashMap.newKeySet();
    private static final Map<String, Instant> activationTimes = new ConcurrentHashMap<>();
    private static final long TIMEOUT_MINUTES = 10;

    private static final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "demo-mode-cleanup");
        t.setDaemon(true);
        return t;
    });

    static {
        // Check every minute for expired demo mode sessions
        scheduler.scheduleAtFixedRate(DemoModeWeb::cleanupExpiredSessions, 1, 1, TimeUnit.MINUTES);
    }

    @Secured({"ROLE_USER"})
    @PutMapping("/internalapi/demomode")
    public void activateDemoMode(Principal principal) {
        String username = resolveUsername(principal);
        usersInDemoMode.add(username);
        activationTimes.put(username, Instant.now());
        logger.info("Demo mode activated for user '{}'", username);
    }

    @Secured({"ROLE_USER"})
    @DeleteMapping("/internalapi/demomode")
    public void deactivateDemoMode(Principal principal) {
        String username = resolveUsername(principal);
        boolean wasActive = usersInDemoMode.remove(username);
        activationTimes.remove(username);
        if (wasActive) {
            logger.info("Demo mode deactivated for user '{}'", username);
        }
    }

    /**
     * Check if the current request's user is in demo mode.
     * Can be called from any controller/service in the request thread
     * because SessionStorage.username is a ThreadLocal populated by the Interceptor.
     */
    public static boolean isDemoModeActive(Principal principal) {
        String username = resolveUsername(principal);
        return username != null && usersInDemoMode.contains(username);
    }

    /**
     * Remove a user from demo mode (used by timeout cleanup).
     */
    static void removeUserFromDemoMode(String username) {
        usersInDemoMode.remove(username);
        activationTimes.remove(username);
    }

    /**
     * Get count of users currently in demo mode (for diagnostics).
     */
    static int getDemoModeUserCount() {
        return usersInDemoMode.size();
    }

    private static void cleanupExpiredSessions() {
        Instant cutoff = Instant.now().minusSeconds(TIMEOUT_MINUTES * 60);
        activationTimes.forEach((username, activatedAt) -> {
            if (activatedAt.isBefore(cutoff)) {
                logger.info("Demo mode auto-deactivated for user '{}' after {} minute timeout", username, TIMEOUT_MINUTES);
                usersInDemoMode.remove(username);
                activationTimes.remove(username);
            }
        });
    }

    private static String resolveUsername(Principal principal) {
        if (principal != null) {
            return principal.getName();
        }
        // Fallback: when auth is NONE, SessionStorage has "AnonymousUser"
        String sessionUsername = SessionStorage.username.get();
        return sessionUsername == null ? "AnonymousUser" : sessionUsername;
    }
}
