package org.nzbhydra.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a web handler method (or every handler method of a controller) as reachable without any role, on purpose.
 *
 * <p>Every request-mapped method in an {@code org.nzbhydra} controller must carry either
 * {@link org.springframework.security.access.annotation.Secured} or this annotation, on the method or on its class.
 * {@link UnmarkedEndpointInterceptor} refuses requests to handlers that have neither (when auth is configured), and
 * {@code EndpointAuthorizationCoverageTest} fails the build when one appears. The HTTP filter chain lets every role
 * through, so a missing annotation would otherwise make the endpoint public by accident.
 *
 * <p>A public endpoint has to protect itself where needed, e.g. by checking the API key.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.TYPE})
public @interface PublicEndpoint {

    /**
     * Why this endpoint needs no role and what, if anything, protects it instead.
     */
    String reason();
}
