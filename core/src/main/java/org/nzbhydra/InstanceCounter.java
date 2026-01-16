

package org.nzbhydra;

import jakarta.annotation.PostConstruct;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;

@Component
public class InstanceCounter {

    private static final Logger logger = LoggerFactory.getLogger(InstanceCounter.class);

    private static final String URL = "https://github.com/theotherp/apitests/releases/download/v24.0.0/instancecounter.zip";

    @Autowired
    protected HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactory;

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private BaseConfigHandler baseConfigHandler;

    @PostConstruct
    public void downloadInstanceCounter() {
        if (!configProvider.getBaseConfig().getMain().isInstanceCounterDownloaded()) {
            ClientHttpRequest request = clientHttpRequestFactory.createRequest(URI.create(URL), HttpMethod.GET);
            try (ClientHttpResponse response = request.execute()) {
                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("Instance counted");
                    configProvider.getBaseConfig().getMain().setInstanceCounterDownloaded(true);
                    baseConfigHandler.save(false);
                } else {
                    logger.error("Unable to count instance. Response: " + response.getStatusText());
                }
            } catch (IOException e) {
                logger.error("Unable to count instance", e);
            }

        }
    }

}
