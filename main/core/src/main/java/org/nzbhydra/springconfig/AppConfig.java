package org.nzbhydra.springconfig;

import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.vendor.HibernateJpaSessionFactoryBean;
import org.springframework.web.client.RestTemplate;

import javax.persistence.EntityManagerFactory;


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


    @Bean
    public HibernateJpaSessionFactoryBean sessionFactory(EntityManagerFactory emf) {
        HibernateJpaSessionFactoryBean fact = new HibernateJpaSessionFactoryBean();
        fact.setEntityManagerFactory(emf);
        return fact;
    }


}
