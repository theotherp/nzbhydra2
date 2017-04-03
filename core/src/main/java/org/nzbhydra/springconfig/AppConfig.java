package org.nzbhydra.springconfig;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;


@Configuration
public class AppConfig {

    ObjectMapper mapper = new ObjectMapper().registerModule(new Jdk8Module());

    @Bean
    public RestTemplate getRestTemplate() {
        return new RestTemplate();
    }




}
