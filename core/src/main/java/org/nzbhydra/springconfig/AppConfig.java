package org.nzbhydra.springconfig;

import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.client.RestTemplate;

import javax.sql.DataSource;


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

    //https://stackoverflow.com/a/49141541
    @Primary
    @Bean
    public DataSource customDataSource() {

        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName(env.getProperty("spring.datasource.driverClassName"));
        dataSource.setUrl(env.getProperty("spring.datasource.url"));
        dataSource.setUsername(env.getProperty("spring.datasource.username"));
        dataSource.setPassword(env.getProperty("spring.datasource.password"));

        return dataSource;

    }




    //TODO: What was this for???
//    @Bean
//    public HibernateJpaSessionFactoryBean sessionFactory(EntityManagerFactory emf) {
//        HibernateJpaSessionFactoryBean fact = new HibernateJpaSessionFactoryBean();
//        fact.setEntityManagerFactory(emf);
//        return fact;
//    }



}
