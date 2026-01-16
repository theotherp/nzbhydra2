

package org.nzbhydra.misc;

import com.google.common.base.Throwables;
import com.google.common.collect.Sets;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.web.method.annotation.ModelAttributeMethodProcessor;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.FrameworkServlet;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

public class StackTraceFilter {

    public static String getFilteredStackTrace(Throwable throwable) {


        final String stackTraceAsString = Throwables.getStackTraceAsString(throwable);
        final Set<String> classes = Sets.newHashSet(
            org.springframework.security.web.ObservationFilterChainDecorator.class.getName(),
            org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter.class.getName(),
            org.springframework.security.web.access.intercept.AuthorizationFilter.class.getName(),
            org.apache.catalina.core.ApplicationFilterChain.class.getName(),
            "org.springframework.web.servlet",
            FilterChainProxy.class.getName(),
            DispatcherServlet.class.getName(),
            FrameworkServlet.class.getName(),
            ModelAttributeMethodProcessor.class.getName(),
            SecurityContextHolder.class.getName(),
            "org.apache.catalina",
            "org.apache.tomcat",
            "org.apache.coyote",
            "org.springframework.web.method",
            "org.springframework.web.filter",
            "jakarta.servlet",
            org.springframework.security.web.authentication.logout.LogoutFilter.class.getName()

        );
        return Arrays.stream(stackTraceAsString.split("\n"))
            .map(x -> x.replace("\t", "").strip())
            .filter(x -> classes.stream().noneMatch(clazz -> x.strip().replace("\t", "").startsWith("at " + clazz)))
            .collect(Collectors.joining("\n"));


    }
}
