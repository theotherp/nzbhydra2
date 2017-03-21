package org.nzbhydra.web;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.io.File;

@Configuration
public class WebConfiguration extends WebMvcConfigurationSupport {


    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File staticFile = new File("static");

        registry.addResourceHandler("/static/**")
                .addResourceLocations(staticFile.toURI().toString().replace("file:/", "file:///")) //Doesn't work with simple file URL for some weird reason
                .setCachePeriod(0).resourceChain(true);
        registry.setOrder(0);
    }


    @Bean
    public RequestMappingHandlerMapping requestMappingHandlerMapping() {
        RequestMappingHandlerMapping handler = super.requestMappingHandlerMapping();
        handler.setOrder(1);
        return handler;
    }

    @Bean
    public FilterRegistrationBean filterRegistrationBean() {
        FilterRegistrationBean registrationBean = new FilterRegistrationBean();
        CharacterEncodingFilter characterEncodingFilter = new CharacterEncodingFilter();
        characterEncodingFilter.setForceEncoding(true);
        characterEncodingFilter.setEncoding("UTF-8");
        registrationBean.setFilter(characterEncodingFilter);
        return registrationBean;
    }
}
