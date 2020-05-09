/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra;

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
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

    @PostConstruct
    public void downloadInstanceCounter() {
        if (!configProvider.getBaseConfig().getMain().isInstanceCounterDownloaded()) {
            ClientHttpRequest request = clientHttpRequestFactory.createRequest(URI.create(URL), HttpMethod.GET);
            try (ClientHttpResponse response = request.execute()) {
                if (response.getStatusCode().is2xxSuccessful()) {
                    logger.info("Instance counted");
                    configProvider.getBaseConfig().getMain().setInstanceCounterDownloaded(true);
                    configProvider.getBaseConfig().save(false);
                } else {
                    logger.error("Unable to count instance. Response: " + response.getStatusText());
                }
            } catch (IOException e) {
                logger.error("Unable to count instance", e);
            }

        }
    }

}
