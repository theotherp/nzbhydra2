package org.nzbhydra.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.auth.AuthType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UnmarkedEndpointInterceptorTest {

    private static final String NATIVE_BUILD_PROPERTY = "HYDRA_NATIVE_BUILD";

    @Mock
    private ConfigProvider configProvider;
    @InjectMocks
    private UnmarkedEndpointInterceptor testee;

    private final BaseConfig baseConfig = new BaseConfig();
    private String previousNativeBuildProperty;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        previousNativeBuildProperty = System.getProperty(NATIVE_BUILD_PROPERTY);
        System.setProperty(NATIVE_BUILD_PROPERTY, "false");
        when(configProvider.getBaseConfig()).thenReturn(baseConfig);
        mockMvc = MockMvcBuilders.standaloneSetup(new UnmarkedController(), new SecuredController(), new ClassSecuredController())
            .addInterceptors(testee)
            .build();
    }

    @AfterEach
    void tearDown() {
        if (previousNativeBuildProperty == null) {
            System.clearProperty(NATIVE_BUILD_PROPERTY);
        } else {
            System.setProperty(NATIVE_BUILD_PROPERTY, previousNativeBuildProperty);
        }
    }

    @Test
    void shouldRefuseUnmarkedHandlerWhenAuthIsConfigured() throws Exception {
        baseConfig.getAuth().setAuthType(AuthType.FORM);

        mockMvc.perform(get("/test/unmarked"))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldAllowUnmarkedHandlerWithoutAuth() throws Exception {
        baseConfig.getAuth().setAuthType(AuthType.NONE);

        mockMvc.perform(get("/test/unmarked"))
            .andExpect(status().isOk())
            .andExpect(content().string("unmarked"));
    }

    @Test
    void shouldRefuseUnmarkedHandlerWithoutAuthInNativeBuild() throws Exception {
        baseConfig.getAuth().setAuthType(AuthType.NONE);
        System.setProperty(NATIVE_BUILD_PROPERTY, "true");

        mockMvc.perform(get("/test/unmarked"))
            .andExpect(status().isForbidden());
    }

    @Test
    void shouldAllowSecuredAndPublicHandlersWhenAuthIsConfigured() throws Exception {
        baseConfig.getAuth().setAuthType(AuthType.BASIC);

        //The role itself is checked by method security, which this test does not set up
        mockMvc.perform(get("/test/secured"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/test/public"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/test/classSecured"))
            .andExpect(status().isOk());
    }

    @Test
    void shouldOnlyCheckHydraHandlers() {
        assertThat(UnmarkedEndpointInterceptor.isHydraHandler(UnmarkedController.class)).isTrue();
        //springdoc, actuator and the like are left alone
        assertThat(UnmarkedEndpointInterceptor.isHydraHandler(RequestMappingHandlerMapping.class)).isFalse();
    }

    @RestController
    static class UnmarkedController {

        @GetMapping("/test/unmarked")
        public String unmarked() {
            return "unmarked";
        }
    }

    @RestController
    static class SecuredController {

        @Secured({"ROLE_USER"})
        @GetMapping("/test/secured")
        public String secured() {
            return "secured";
        }

        @PublicEndpoint(reason = "test")
        @GetMapping("/test/public")
        public String publicEndpoint() {
            return "public";
        }
    }

    @RestController
    @Secured({"ROLE_ADMIN"})
    static class ClassSecuredController {

        @GetMapping("/test/classSecured")
        public String classSecured() {
            return "classSecured";
        }
    }
}
