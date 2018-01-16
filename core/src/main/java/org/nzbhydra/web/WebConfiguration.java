package org.nzbhydra.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.oxm.XmlMappingException;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import org.springframework.oxm.mime.MimeContainer;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import javax.xml.bind.Marshaller;
import javax.xml.transform.Result;
import javax.xml.transform.Source;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Configuration
public class WebConfiguration extends WebMvcConfigurationSupport {

    @Autowired
    private Interceptor interceptor;

    private static final Logger logger = LoggerFactory.getLogger(WebConfiguration.class);

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/")
                .setCacheControl(CacheControl.noCache())
                .resourceChain(false)
        //.addResolver(new VersionResourceResolver().addContentVersionStrategy("/static/js/**", "/static/css/**"))
        ;


        registry.setOrder(0);
    }

    @Override
    protected void addCorsMappings(CorsRegistry registry) {
        //registry.addMapping("/**").allowedOrigins("http://127.0.0.1:5076", "https://127.0.0.1:9091");
        //Later: Check when actually calling from other host, seems to work on server
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

    @Override
    protected void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor);
    }

    /**
     * Enable pretty printing of returned XML
     */
    @Bean
    public Jaxb2Marshaller marshaller() {
        Jaxb2Marshaller marshaller = new Jaxb2Marshaller() {
            @Override
            public void setSchema(Resource schemaResource) {
                super.setSchema(schemaResource);
            }

            @Override
            public void marshal(Object graph, Result result) throws XmlMappingException {
                super.marshal(graph, result);
            }

            @Override
            public void marshal(Object graph, Result result, MimeContainer mimeContainer) throws XmlMappingException {
                super.marshal(graph, result, mimeContainer);
            }

            @Override
            public void setUnmarshallerProperties(Map<String, ?> properties) {
                super.setUnmarshallerProperties(properties);
            }

            @Override
            protected Marshaller createMarshaller() {
                return super.createMarshaller();
            }

            @Override
            public Object unmarshal(Source source) throws XmlMappingException {
                return super.unmarshal(source);
            }

            @Override
            public Object unmarshal(Source source, MimeContainer mimeContainer) throws XmlMappingException {
                return super.unmarshal(source, mimeContainer);
            }
        };
        Map<String, Boolean> map = new HashMap<>();
        map.put(Marshaller.JAXB_FORMATTED_OUTPUT, Boolean.TRUE);
        marshaller.setMarshallerProperties(map);
        marshaller.setPackagesToScan("org.nzbhydra");
        return marshaller;
    }



    /**
     * Enable pretty printing of returned JSON
     */
    @Override
    protected void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
        for (HttpMessageConverter<?> converter : converters) {
            if (converter instanceof MappingJackson2HttpMessageConverter) {
                MappingJackson2HttpMessageConverter jacksonConverter = (MappingJackson2HttpMessageConverter) converter;
                jacksonConverter.setPrettyPrint(true);
            }
        }
    }


}
