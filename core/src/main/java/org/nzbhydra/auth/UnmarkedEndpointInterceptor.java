package org.nzbhydra.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.lang.reflect.Method;

/**
 * Deny-by-default for web handlers: a request to an {@code org.nzbhydra} handler method that is neither
 * {@link Secured} nor {@link PublicEndpoint} (on the method or its class) is answered with 403.
 *
 * <p>The HTTP filter chain admits every role, anonymous included, and the actual access control is {@code @Secured}
 * method security. A handler without either annotation would therefore be reachable by anyone even with every area
 * restricted. Like {@link HydraGlobalMethodSecurityConfiguration}, nothing is refused when the auth type is NONE,
 * except in native builds.
 *
 * <p>Handlers outside {@code org.nzbhydra} (springdoc, actuator, static resources) are not checked.
 */
@Component
public class UnmarkedEndpointInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(UnmarkedEndpointInterceptor.class);
    private static final String HYDRA_PACKAGE_PREFIX = "org.nzbhydra.";

    @Autowired
    private ConfigProvider configProvider;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod handlerMethod) || !isHydraHandler(handlerMethod.getBeanType())) {
            return true;
        }
        if (isMarked(handlerMethod.getMethod(), handlerMethod.getBeanType())) {
            return true;
        }
        AuthType authType = configProvider.getBaseConfig().getAuth().getAuthType();
        if (authType == AuthType.NONE && !NzbHydra.isNativeBuild()) {
            return true;
        }
        logger.error("Refusing request to {}: handler {} is neither @Secured nor @PublicEndpoint. This is an implementation error",
            request.getRequestURI(), handlerMethod.getShortLogMessage());
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
        return false;
    }

    static boolean isHydraHandler(Class<?> beanType) {
        return beanType.getName().startsWith(HYDRA_PACKAGE_PREFIX);
    }

    /**
     * @return whether the handler method declares its access, either way, on itself or on its class.
     */
    public static boolean isMarked(Method method, Class<?> beanType) {
        return AnnotatedElementUtils.hasAnnotation(method, Secured.class)
            || AnnotatedElementUtils.hasAnnotation(method, PublicEndpoint.class)
            || AnnotatedElementUtils.hasAnnotation(beanType, Secured.class)
            || AnnotatedElementUtils.hasAnnotation(beanType, PublicEndpoint.class);
    }
}
