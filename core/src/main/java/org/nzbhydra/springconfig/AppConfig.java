package org.nzbhydra.springconfig;

import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;


@EnableAsync
@Configuration
public class AppConfig {

    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;

    @Bean
    public RestTemplate getRestTemplate() {
        HydraOkHttp3ClientHttpRequestFactory factory = requestFactory;

        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setRequestFactory(factory);
        return restTemplate;
    }

}
