package org.nzbhydra.nativeimage;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.Marshaller;
import org.junit.jupiter.api.Test;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.auth.SecurityConfig;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.indexers.IndexerRepository;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.web.WebSocketConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.health.actuate.endpoint.HealthEndpoint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.test.context.ContextConfiguration;
import tools.jackson.databind.ObjectMapper;

import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = NzbHydra.class, webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ContextConfiguration(initializers = NativeApplicationContextTest.BrowserDisabledInitializer.class)
class NativeApplicationContextTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private SecurityConfig securityConfig;

    @Autowired
    private WebSocketConfig webSocketConfig;

    @Autowired
    private HealthEndpoint healthEndpoint;

    @Test
    void shouldStartNativeApplicationContextAndExerciseDynamicInfrastructure() throws Exception {
        assertThat(indexerRepository.count()).isZero();
        assertThat(securityConfig).isNotNull();
        assertThat(webSocketConfig).isNotNull();
        assertThat(healthEndpoint.health().getStatus().getCode()).isEqualTo("UP");
        assertThat(getClass().getResource("/templates/index.html")).isNotNull();
        assertThat(getClass().getResource("/templates/login.html")).isNotNull();
        assertThat(getClass().getResource("/templates/error.html")).isNotNull();

        String indexerConfigJson = objectMapper.writeValueAsString(new IndexerConfig());
        assertThat(objectMapper.readValue(indexerConfigJson, IndexerConfig.class)).isNotNull();

        StringWriter xml = new StringWriter();
        Marshaller marshaller = JAXBContext.newInstance(NewznabXmlRoot.class).createMarshaller();
        marshaller.marshal(new NewznabXmlRoot(), xml);
        assertThat(xml.toString()).contains("rss");
    }

    static class BrowserDisabledInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            System.setProperty(NzbHydra.BROWSER_DISABLED, "true");
        }
    }
}
