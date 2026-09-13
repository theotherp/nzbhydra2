package org.nzbhydra.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Makes sure that the config endpoints are not accidentally exposed to non-admin users.
 */
class ConfigWebSecurityTest {

    private static final List<Class<? extends Annotation>> MAPPING_ANNOTATIONS = List.of(
            RequestMapping.class, GetMapping.class, PostMapping.class, PutMapping.class, DeleteMapping.class, PatchMapping.class);

    /**
     * Endpoints which are deliberately available to regular users because the UI needs them without admin rights.
     */
    private static final Set<String> DELIBERATELY_USER_FACING = Set.of("getSafeConfig");

    @Test
    void shouldSecureFolderListingEndpointForAdminsOnly() {
        Method method = Arrays.stream(ConfigWeb.class.getDeclaredMethods())
                .filter(x -> x.getName().equals("getDirectoryListing"))
                .findFirst()
                .orElseThrow();

        assertThat(getRoles(method)).containsExactly("ROLE_ADMIN");
    }

    @Test
    void shouldSecureAllEndpointsForAdminsOnlyUnlessDeliberatelyUserFacing() {
        for (Method method : ConfigWeb.class.getDeclaredMethods()) {
            if (!isEndpoint(method) || DELIBERATELY_USER_FACING.contains(method.getName())) {
                continue;
            }
            assertThat(getRoles(method))
                    .as("Endpoint %s must be secured for admins only", method.getName())
                    .containsExactly("ROLE_ADMIN");
        }
    }

    private boolean isEndpoint(Method method) {
        return MAPPING_ANNOTATIONS.stream().anyMatch(x -> method.getAnnotation(x) != null);
    }

    private String[] getRoles(Method method) {
        Secured secured = method.getAnnotation(Secured.class);
        return secured == null ? new String[]{} : secured.value();
    }
}
