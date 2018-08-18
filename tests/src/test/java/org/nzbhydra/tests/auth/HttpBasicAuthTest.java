package org.nzbhydra.tests.auth;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.auth.HydraUserDetailsManager;
import org.nzbhydra.config.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import javax.servlet.http.Cookie;

import static org.junit.Assert.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@SpringBootTest(classes = NzbHydra.class)
@WebAppConfiguration
@TestPropertySource(locations = "classpath:/org/nzbhydra/tests/auth/allRestrictedWithBasicStatsAndAdminUser.properties")
@Import(HttpBasicAuthTest.Config.class)
@DirtiesContext
public class HttpBasicAuthTest {

    @Autowired
    private WebApplicationContext context;
    @Autowired
    private BaseConfig baseConfig;
    @Autowired
    private HydraUserDetailsManager userDetailsManager;


    private MockMvc mvc;

    @Before
    public void setup() {
        mvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build(
                );
        baseConfig.setAuth(Config.getBasicAuthConfig());
        userDetailsManager.handleConfigChangedEvent(new ConfigChangedEvent(this, new BaseConfig(), baseConfig));
    }

    @Test
    public void shouldFollowRoles() throws Exception {
        userDetailsManager.handleConfigChangedEvent(new ConfigChangedEvent(this, new BaseConfig(), baseConfig));
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf())).andExpect(status().is(401));
        mvc.perform(MockMvcRequestBuilders.get("/stats").with(csrf())).andExpect(status().is(401));
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf())).andExpect(status().is(401));

        checkMainStatsAndConfig("u", "u", 200, 403, 403);
        checkMainStatsAndConfig("s", "s", 200, 403, 200);
        checkMainStatsAndConfig("a", "a", 200, 200, 200);

        checkMainStatsAndConfig("wrong", "wrong", 401, 401, 401);
    }

    @Test
    public void shouldAllowChangingUserRolesAtRuntime() throws Exception {
        checkMainStatsAndConfig("u", "u", 200, 403, 403);
        baseConfig.getAuth().getUsers().get(0).setMaySeeStats(true);
        baseConfig.getAuth().getUsers().get(0).setMaySeeAdmin(true);
        userDetailsManager.handleConfigChangedEvent(new ConfigChangedEvent(this, new BaseConfig(), baseConfig));
        checkMainStatsAndConfig("u", "u", 200, 200, 200);
    }

    @Test
    public void shouldRememberUser() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf())).andExpect(status().is(401));
        MvcResult result = mvc.perform(MockMvcRequestBuilders.get("/").with(csrf()).with(httpBasic("u", "u"))).andExpect(status().is(200)).andReturn();
        Cookie cookie = result.getResponse().getCookie("remember-me");
        assertNotNull(cookie);
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf()).cookie(cookie)).andExpect(status().isOk());
    }

    private void checkMainStatsAndConfig(String username, String password, int statusMain, int statusConfig, int statusStats) throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf()).with(httpBasic(username, password))).andExpect(status().is(statusMain));
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf()).with(httpBasic(username, password))).andExpect(status().is(statusConfig));
        mvc.perform(MockMvcRequestBuilders.get("/stats").with(csrf()).with(httpBasic(username, password))).andExpect(status().is(statusStats));
    }

    public static class Config {


        @Bean
        @Primary
        public BaseConfig baseConfig() {
            BaseConfig baseConfig = new BaseConfig();
            baseConfig.getMain().setUseCsrf(false);
            baseConfig.setAuth(getBasicAuthConfig());
            BaseConfig.isProductive = false;
            return baseConfig;
        }

        public static AuthConfig getBasicAuthConfig() {
            AuthConfig authConfig = new AuthConfig();
            authConfig.setAuthType(AuthType.BASIC);
            authConfig.setRestrictAdmin(true);
            authConfig.setRestrictDetailsDl(true);
            authConfig.setRestrictSearch(true);
            authConfig.setRestrictIndexerSelection(true);
            authConfig.setRestrictStats(true);

            addUser(authConfig, "u", "u", false, false);
            addUser(authConfig, "s", "s", true, false);
            addUser(authConfig, "a", "a", true, true);
            return authConfig;
        }

        protected static void addUser(AuthConfig authConfig, String username, final String password, boolean maySeeStats, boolean maySeeAdmin) {
            UserAuthConfig userAuthConfig = new UserAuthConfig();
            userAuthConfig.setMaySeeStats(maySeeStats);
            userAuthConfig.setMaySeeAdmin(maySeeAdmin);
            userAuthConfig.setMaySeeDetailsDl(false);
            userAuthConfig.setUsername(username);
            userAuthConfig.setPassword("{noop}" + password);
            authConfig.getUsers().add(userAuthConfig);
        }

    }
}