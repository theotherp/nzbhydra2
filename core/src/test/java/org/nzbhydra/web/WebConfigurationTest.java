package org.nzbhydra.web;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.springframework.context.support.StaticApplicationContext;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.HttpMessageConverters;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.mock.http.MockHttpInputMessage;
import org.springframework.mock.http.MockHttpOutputMessage;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockServletContext;
import org.springframework.web.HttpRequestHandler;
import org.springframework.web.servlet.HandlerExecutionChain;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.handler.AbstractUrlHandlerMapping;
import org.springframework.web.util.ServletRequestPathUtils;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

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

    @Test
    void shouldServeExternalReactAssetsBeforePackagedAssets() throws Exception {
        Path externalAsset = tempDir.resolve("static/react/assets/index.js");
        Files.createDirectories(externalAsset.getParent());
        Files.writeString(externalAsset, "external React asset");

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

        assertThat(response.getContentAsString()).isEqualTo("external React asset");
    }

    @Test
    void shouldAcceptDownloaderConfigBodyWithoutPrimitiveFields() throws Exception {
        JacksonJsonHttpMessageConverter converter = installedJsonConverter();

        Object read = converter.read(DownloaderConfig.class,
            jsonBody("{\"name\":\"d1\",\"downloaderType\":\"SABNZBD\",\"url\":\"http://localhost:8080\"}"));

        assertThat(read).isInstanceOf(DownloaderConfig.class);
        DownloaderConfig downloaderConfig = (DownloaderConfig) read;
        assertThat(downloaderConfig.isEnabled()).isFalse();
        assertThat(downloaderConfig.isAddPaused()).isFalse();
        assertThat(downloaderConfig.getName()).isEqualTo("d1");
        assertThat(downloaderConfig.getUrl()).isEqualTo("http://localhost:8080");
    }

    @Test
    void shouldAcceptDownloaderConfigBodyWithExplicitlyNulledPrimitiveFields() throws Exception {
        JacksonJsonHttpMessageConverter converter = installedJsonConverter();

        Object read = converter.read(DownloaderConfig.class,
            jsonBody("{\"name\":\"d1\",\"downloaderType\":\"SABNZBD\",\"url\":\"http://localhost:8080\",\"enabled\":null,\"addPaused\":null}"));

        assertThat(read).isInstanceOf(DownloaderConfig.class);
        DownloaderConfig downloaderConfig = (DownloaderConfig) read;
        assertThat(downloaderConfig.isEnabled()).isFalse();
        assertThat(downloaderConfig.isAddPaused()).isFalse();
        assertThat(downloaderConfig.getName()).isEqualTo("d1");
    }

    @Test
    void shouldAcceptSearchRequestParametersBodyWithoutPrimitiveFields() throws Exception {
        JacksonJsonHttpMessageConverter converter = installedJsonConverter();

        Object read = converter.read(SearchRequestParameters.class,
            jsonBody("{\"query\":\"some query\",\"mode\":\"search\",\"category\":\"All\"}"));

        assertThat(read).isInstanceOf(SearchRequestParameters.class);
        SearchRequestParameters parameters = (SearchRequestParameters) read;
        assertThat(parameters.isLoadAll()).isFalse();
        assertThat(parameters.getSearchRequestId()).isZero();
        assertThat(parameters.getQuery()).isEqualTo("some query");
    }

    @Test
    void shouldStillWriteIndentedJson() throws Exception {
        JacksonJsonHttpMessageConverter converter = installedJsonConverter();
        DownloaderConfig downloaderConfig = new DownloaderConfig();
        downloaderConfig.setName("d1");

        MockHttpOutputMessage outputMessage = new MockHttpOutputMessage();
        converter.write(downloaderConfig, MediaType.APPLICATION_JSON, outputMessage);

        assertThat(outputMessage.getBodyAsString(StandardCharsets.UTF_8)).containsPattern("\\n\\s+\"name\"\\s*:\\s*\"d1\"");
    }

    /**
     * Reads through the converter Spring actually installs, never through a mapper built by the test itself.
     */
    private JacksonJsonHttpMessageConverter installedJsonConverter() {
        HttpMessageConverters.ServerBuilder builder = HttpMessageConverters.forServer();
        new WebConfiguration().configureMessageConverters(builder);
        List<JacksonJsonHttpMessageConverter> jsonConverters = new ArrayList<>();
        for (HttpMessageConverter<?> converter : builder.build()) {
            if (converter instanceof JacksonJsonHttpMessageConverter jsonConverter) {
                jsonConverters.add(jsonConverter);
            }
        }
        assertThat(jsonConverters).hasSize(1);
        return jsonConverters.get(0);
    }

    private static MockHttpInputMessage jsonBody(String body) {
        MockHttpInputMessage inputMessage = new MockHttpInputMessage(body.getBytes(StandardCharsets.UTF_8));
        inputMessage.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        return inputMessage;
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
