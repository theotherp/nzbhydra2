package org.nzbhydra.tests.auth;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.auth.HydraAnonymousAuthenticationFilter;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@WebAppConfiguration
@TestPropertySource(locations = "classpath:/org/nzbhydra/tests/auth/onlyConfigRestrictedWithBasicStatsAndAdminUser.properties")
public class DontRestrictStatsAuthTest {
    @Autowired
    private WebApplicationContext context;

    @Autowired
    private HydraAnonymousAuthenticationFilter authenticationFilter;
    @Autowired
    private BaseConfig baseConfig;

    private MockMvc mvc;

    @Before
    public void setup() {
        mvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }

    @Test
    public void shouldAllowSearchingAndStatsForAllButRestrictConfig() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf())).andExpect(status().is(200));
        mvc.perform(MockMvcRequestBuilders.get("/stats").with(csrf())).andExpect(status().is(200));
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf())).andExpect(status().is(401));

        checkMainStatsAndConfig("a", "a", 200, 200, 200);

        checkMainStatsAndConfig("wrong", "wrong", 401, 401, 401);
    }

    @Test
    public void shouldAllowChangingRestrictionsAtRuntime() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf())).andExpect(status().is(401));
        baseConfig.getAuth().setRestrictAdmin(false);
        authenticationFilter.handleConfigChangedEvent(new ConfigChangedEvent(this, baseConfig));
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf())).andExpect(status().is(200));
    }

    private void checkMainStatsAndConfig(String username, String password, int statusMain, int statusConfig, int statusStats) throws Exception {
        RequestPostProcessor postProcessor = username != null ? httpBasic(username, password) : new NopRequestPostProcessor();
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf()).with(postProcessor)).andExpect(status().is(statusMain));
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf()).with(postProcessor)).andExpect(status().is(statusConfig));
        mvc.perform(MockMvcRequestBuilders.get("/stats").with(csrf()).with(postProcessor)).andExpect(status().is(statusStats));
    }

    private class NopRequestPostProcessor implements RequestPostProcessor {

        @Override
        public MockHttpServletRequest postProcessRequest(MockHttpServletRequest request) {
            return request;
        }
    }

}