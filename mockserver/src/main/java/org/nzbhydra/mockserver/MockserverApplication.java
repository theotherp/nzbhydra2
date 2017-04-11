package org.nzbhydra.mockserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;


@Configuration
@EnableAutoConfiguration
@ComponentScan
public class MockserverApplication {

    public static void main(String[] args) {
        SpringApplication.run(MockserverApplication.class, args);
    }
}
