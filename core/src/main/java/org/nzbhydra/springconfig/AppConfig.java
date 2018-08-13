package org.nzbhydra.springconfig;

import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;


@EnableAsync
@Configuration
public class AppConfig {

    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory requestFactory;

    @Autowired
    private Environment env;

    @Bean
    public RestTemplate getRestTemplate() {
        HydraOkHttp3ClientHttpRequestFactory factory = requestFactory;

        RestTemplate restTemplate = new RestTemplate();
        restTemplate.setRequestFactory(factory);
        return restTemplate;
    }


    //TODO: What was this for???
//    @Bean
//    public HibernateJpaSessionFactoryBean sessionFactory(EntityManagerFactory emf) {
//        HibernateJpaSessionFactoryBean fact = new HibernateJpaSessionFactoryBean();
//        fact.setEntityManagerFactory(emf);
//        return fact;
//    }



}
