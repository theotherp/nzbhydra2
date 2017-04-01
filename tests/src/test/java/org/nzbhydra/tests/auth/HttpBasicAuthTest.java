package org.nzbhydra.tests.auth;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.nzbhydra.NzbHydra;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
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
public class HttpBasicAuthTest {
    @Autowired
    private WebApplicationContext context;

    private MockMvc mvc;

    @Before
    public void setup() {
        mvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(SecurityMockMvcConfigurers.springSecurity())
                .build();
    }


    @Test
    public void shouldFollowRoles() throws Exception {
        mvc.perform(MockMvcRequestBuilders.get("/").with(csrf())).andExpect(status().is(401));
        mvc.perform(MockMvcRequestBuilders.get("/stats").with(csrf())).andExpect(status().is(401));
        mvc.perform(MockMvcRequestBuilders.get("/config").with(csrf())).andExpect(status().is(401));

        checkMainStatsAndConfig("u", "u", 200, 403, 403);
        checkMainStatsAndConfig("s", "s", 200, 403, 200);
        checkMainStatsAndConfig("a", "a", 200, 200, 200);

        checkMainStatsAndConfig("wrong", "wrong", 401, 401, 401);
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

}