package org.nzbhydra.auth;

import org.junit.jupiter.api.Test;
import org.nzbhydra.api.ExternalApi;
import org.nzbhydra.web.MainWeb;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.annotation.Secured;
import org.springframework.stereotype.Controller;
import org.springframework.util.ClassUtils;
import org.springframework.util.ReflectionUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.reflect.Method;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fails the build when a request-mapped method in an {@code org.nzbhydra} controller declares neither
 * {@link Secured} nor {@link PublicEndpoint}, on itself or on its class. Such a method would be reachable by anonymous
 * users even with every area restricted (at runtime {@link UnmarkedEndpointInterceptor} refuses it instead).
 *
 * <p>Fix a failure by adding {@code @Secured} with the role the calling page needs, or, if the endpoint must be
 * reachable without any role, {@code @PublicEndpoint} with the reason and whatever protects it instead.
 */
class EndpointAuthorizationCoverageTest {

    @Test
    void shouldDeclareAccessOnEveryHandlerMethod() throws Exception {
        List<Class<?>> controllers = findMainControllers();
        //Guards against a scan that silently finds nothing and therefore checks nothing
        assertThat(controllers).contains(ExternalApi.class, MainWeb.class).hasSizeGreaterThan(30);

        List<String> unmarked = new ArrayList<>();
        List<String> markedBothWays = new ArrayList<>();
        for (Class<?> controller : controllers) {
            for (Method method : ReflectionUtils.getUniqueDeclaredMethods(controller, ReflectionUtils.USER_DECLARED_METHODS)) {
                if (!AnnotatedElementUtils.hasAnnotation(method, RequestMapping.class)) {
                    continue;
                }
                if (!UnmarkedEndpointInterceptor.isMarked(method, controller)) {
                    unmarked.add(describe(controller, method));
                }
                //Also across method and class: method security applies a class-level @Secured to a method marked
                //@PublicEndpoint, and a class-level @PublicEndpoint does not make a method @Secured public
                boolean secured = AnnotatedElementUtils.hasAnnotation(method, Secured.class) || AnnotatedElementUtils.hasAnnotation(controller, Secured.class);
                boolean publicEndpoint = AnnotatedElementUtils.hasAnnotation(method, PublicEndpoint.class) || AnnotatedElementUtils.hasAnnotation(controller, PublicEndpoint.class);
                if (secured && publicEndpoint) {
                    markedBothWays.add(describe(controller, method));
                }
            }
        }

        assertThat(unmarked)
            .as("Handler methods must be @Secured or @PublicEndpoint")
            .isEmpty();
        assertThat(markedBothWays)
            .as("Handler methods must not be both @Secured and @PublicEndpoint, on the method or its class")
            .isEmpty();
    }

    @Test
    void shouldGiveAReasonForEveryPublicEndpoint() throws Exception {
        for (Class<?> controller : findMainControllers()) {
            for (Method method : ReflectionUtils.getUniqueDeclaredMethods(controller, ReflectionUtils.USER_DECLARED_METHODS)) {
                PublicEndpoint publicEndpoint = AnnotatedElementUtils.findMergedAnnotation(method, PublicEndpoint.class);
                if (publicEndpoint != null) {
                    assertThat(publicEndpoint.reason()).as(describe(controller, method)).isNotBlank();
                }
            }
        }
    }

    /**
     * Controllers from the main code only: test classes declare stand-in controllers, which are not part of the app.
     */
    private static List<Class<?>> findMainControllers() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        //Matches @RestController as well, which is meta-annotated with @Controller
        scanner.addIncludeFilter(new AnnotationTypeFilter(Controller.class));
        URL mainClassesLocation = codeLocation(PublicEndpoint.class);
        List<Class<?>> controllers = new ArrayList<>();
        for (BeanDefinition candidate : scanner.findCandidateComponents("org.nzbhydra")) {
            Class<?> controller = ClassUtils.forName(Objects.requireNonNull(candidate.getBeanClassName()), EndpointAuthorizationCoverageTest.class.getClassLoader());
            if (mainClassesLocation.equals(codeLocation(controller))) {
                controllers.add(controller);
            }
        }
        return controllers;
    }

    private static URL codeLocation(Class<?> clazz) {
        return clazz.getProtectionDomain().getCodeSource().getLocation();
    }

    private static String describe(Class<?> controller, Method method) {
        return controller.getName() + "#" + method.getName();
    }
}
