package org.nzbhydra.systemtest;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.BaseConfigHandler;
import org.springframework.context.annotation.AnnotatedBeanDefinitionReader;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.GenericWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Proves ADR-0048's first binding constraint: the reset endpoint is unreachable in a production-shaped deployment.
 *
 * <p>The check queries the path over MockMvc, so it fails if the gate is ever removed or weakened. Both directions are
 * asserted: without the profile the request must answer 404 and must not have reached the reset, and with it the same
 * request must be handled and must reach {@link BaseConfigHandler#replace}. A gate that 404s unconditionally - a typo
 * in the path, a controller that never registers - would pass the first assertion alone.
 *
 * <p>The gate is a runtime check on the active profiles rather than {@code @Profile}, because {@code @Profile} is
 * evaluated at AOT processing time for the native image and would drop the bean from it entirely (see the controller's
 * javadoc). So the controller is registered in both directions here, exactly as in both images, and the difference the
 * test observes is the response it gives.
 *
 * <p>A minimal web context rather than {@code @SpringBootTest}: booting the whole application in core's test scope is
 * known-flaky here (see {@code ConfigWebTest}, disabled for exactly that reason), and this check needs nothing from
 * the rest of the application beyond the environment the gate reads. {@code MainWebTest} is the precedent for driving
 * one controller through MockMvc.
 */
class SystemTestStateResetWebTest {

    @Test
    void shouldAnswerNotFoundWithoutSystemtestProfile() throws Exception {
        try (GenericWebApplicationContext context = buildContext()) {
            MockMvcBuilders.webAppContextSetup(context).build()
                    .perform(post(SystemTestStateResetWeb.RESET_ENDPOINT))
                    .andExpect(status().isNotFound());

            //404 because the gate refused it, not because nothing answered: the reset itself never ran
            Mockito.verify(context.getBean(BaseConfigHandler.class), Mockito.never()).replace(Mockito.any());
        }
    }

    @Test
    void shouldReachHandlerWithSystemtestProfile() throws Exception {
        try (GenericWebApplicationContext context = buildContext("systemtest")) {
            final MockMvc mockMvc = MockMvcBuilders.webAppContextSetup(context).build();

            mockMvc.perform(post(SystemTestStateResetWeb.RESET_ENDPOINT))
                    .andExpect(status().isOk());

            //Not just mapped: the request actually ran the reset, with the baseline the server read for itself
            Mockito.verify(context.getBean(BaseConfigHandler.class)).replace(Mockito.any(BaseConfig.class));
        }
    }

    private GenericWebApplicationContext buildContext(String... activeProfiles) {
        final GenericWebApplicationContext context = new GenericWebApplicationContext(new MockServletContext());
        context.getEnvironment().setActiveProfiles(activeProfiles);
        //A manually registered singleton skips bean post-processing, so the mock's own inherited @Autowired fields
        //are not resolved and the context stays down to the controller and the MVC infrastructure
        context.getBeanFactory().registerSingleton("baseConfigHandler", Mockito.mock(BaseConfigHandler.class));
        //The controller reads the environment set above - the very mechanism under test - so it answers exactly as it
        //would in a running application with or without the profile
        new AnnotatedBeanDefinitionReader(context).register(TestWebConfig.class, SystemTestStateResetWeb.class);
        context.refresh();
        return context;
    }

    /**
     * Deliberately NOT annotated {@code @Configuration}: this nested class compiles to its own class file inside
     * {@code org.nzbhydra}, and during {@code mvn test} the application's {@code @ComponentScan} sees the test
     * classpath - a {@code @Configuration} here is picked up by every {@code @SpringBootTest} booting
     * {@code NzbHydra}, and its {@code @EnableWebMvc} import of {@code DelegatingWebMvcConfiguration} then collides
     * with {@code WebConfiguration extends WebMvcConfigurationSupport}
     * ({@code BeanDefinitionOverrideException: requestMappingHandlerMapping}), failing unrelated tests such as
     * {@code StatsComponentTest}. Explicit registration through {@link AnnotatedBeanDefinitionReader} still
     * processes {@code @EnableWebMvc}'s {@code @Import} without {@code @Configuration} (a "lite" candidate), which
     * this class's own tests prove: without working MVC infrastructure neither branch could answer at all.
     */
    @EnableWebMvc
    static class TestWebConfig {
    }

}
