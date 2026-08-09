package org.nzbhydra.web;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.nzbhydra.NzbHydra;
import org.springframework.context.support.StaticApplicationContext;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.HttpRequestHandler;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.handler.AbstractUrlHandlerMapping;
import org.springframework.web.util.ServletRequestPathUtils;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class WebConfigurationTest {

    @TempDir
    Path tempDir;

    private String originalDataFolder;

    @BeforeEach
    void setUp() throws Exception {
        originalDataFolder = NzbHydra.getDataFolder();
        Files.createDirectory(tempDir.resolve("static"));
        NzbHydra.setDataFolder(tempDir.toString());
    }

    @AfterEach
    void tearDown() {
        NzbHydra.setDataFolder(originalDataFolder);
    }

    @Test
    void shouldServePackagedReactAssetsWhenExternalStaticOverrideExists() throws Exception {
        WebConfiguration configuration = new WebConfiguration();
        StaticApplicationContext applicationContext = new StaticApplicationContext();
        applicationContext.refresh();
        TestResourceHandlerRegistry registry = new TestResourceHandlerRegistry(applicationContext, new MockServletContext());
        configuration.addResourceHandlers(registry);

        AbstractUrlHandlerMapping mapping = registry.handlerMapping();
        mapping.setApplicationContext(applicationContext);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/static/react/assets/index.js");
        request.setServletPath("/static/react/assets/index.js");
        request.setAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE, "/react/assets/index.js");
        ServletRequestPathUtils.parseAndCache(request);
        MockHttpServletResponse response = new MockHttpServletResponse();
        HandlerExecutionChain handler = mapping.getHandler(request);
        ((HttpRequestHandler) handler.getHandler()).handleRequest(request, response);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(response.getContentAsByteArray()).isNotEmpty();
    }

    private static class TestResourceHandlerRegistry extends ResourceHandlerRegistry {

        private TestResourceHandlerRegistry(StaticApplicationContext applicationContext, MockServletContext servletContext) {
            super(applicationContext, servletContext);
        }

        private AbstractUrlHandlerMapping handlerMapping() {
            return (AbstractUrlHandlerMapping) getHandlerMapping();
        }
    }
}
