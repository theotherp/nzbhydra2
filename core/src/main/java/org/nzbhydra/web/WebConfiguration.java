package org.nzbhydra.web;

import com.fasterxml.jackson.databind.module.SimpleModule;
import jakarta.xml.bind.Marshaller;
import org.nzbhydra.NzbHydra;
import org.nzbhydra.api.stats.HistoryRequestConverter;
import org.nzbhydra.api.stats.StatsRequestConverter;
import org.nzbhydra.config.EmptyStringToNullDeserializer;
import org.nzbhydra.config.EmptyStringToNullSerializer;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.OutputType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.format.FormatterRegistry;
import org.springframework.format.support.FormattingConversionService;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.HttpOutputMessage;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.oxm.jaxb.Jaxb2Marshaller;
import org.springframework.web.accept.ContentNegotiationManager;
import org.springframework.web.filter.CharacterEncodingFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.web.servlet.resource.ResourceUrlProvider;

import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@SuppressWarnings("unchecked")
@Configuration(proxyBeanMethods = false)
public class WebConfiguration extends WebMvcConfigurationSupport {

    @Autowired
    private Interceptor interceptor;

    private static final Logger logger = LoggerFactory.getLogger(WebConfiguration.class);

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String[] locations = new String[]{"classpath:/static/"};
        if (NzbHydra.getDataFolder() != null) {
            File staticFolderFile = new File(new File(NzbHydra.getDataFolder()), "static");
            try {
                if (staticFolderFile.exists()) {
                    String fileStatic = staticFolderFile.toURI().toURL().toString();
                    locations = new String[]{fileStatic};
                    logger.warn("Found folder {}. Will load UI resources from there instead", staticFolderFile.getAbsolutePath());
                } else {
                    logger.debug("Static resources folder {} does not exist - using baked in resources", staticFolderFile);
                }
            } catch (MalformedURLException e) {
                logger.error("Unable to build path for local static files");
            }
        }
        registry.addResourceHandler("/static/**")
                .addResourceLocations(locations)
                .setCacheControl(CacheControl.noCache())
                .resourceChain(false);

        //Otherwise swagger is not loaded using /swagger-ui/index.html
        registry.addResourceHandler("/swagger-ui/**")
                // Must match the dependency for swagger-ui
                .addResourceLocations("classpath:/META-INF/resources/webjars/swagger-ui/4.10.3/");

        registry.addResourceHandler("/bower_components/bootstrap-less/fonts/**")
                .addResourceLocations("classpath:/static/fonts/");
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/favicon.ico");

        registry.setOrder(0);
    }


    @Override
    protected void configurePathMatch(PathMatchConfigurer configurer) {
        configurer.setUseTrailingSlashMatch(true);
    }

    @Override
    protected void addCorsMappings(CorsRegistry registry) {
        //registry.addMapping("/**").allowedOrigins("http://127.0.0.1:5076", "https://127.0.0.1:9091");
        //Later: Check when actually calling from other host, seems to work on server
    }

    @Bean
    public RequestMappingHandlerMapping requestMappingHandlerMapping(ContentNegotiationManager mvcContentNegotiationManager,
                                                                     FormattingConversionService mvcConversionService, ResourceUrlProvider mvcResourceUrlProvider) {
        RequestMappingHandlerMapping handler = super.requestMappingHandlerMapping(mvcContentNegotiationManager, mvcConversionService, mvcResourceUrlProvider);
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

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(new StatsRequestConverter());
        registry.addConverter(new HistoryRequestConverter());
    }

    /**
     * Enable pretty printing of returned XML
     */
    @Bean
    public Jaxb2Marshaller marshaller() {
        Jaxb2Marshaller marshaller = new Jaxb2Marshaller();
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
            if (converter instanceof MappingJackson2HttpMessageConverter jacksonConverter) {
                jacksonConverter.setPrettyPrint(true);
                SimpleModule simpleModule = new SimpleModule();
                simpleModule.addDeserializer(String.class, new EmptyStringToNullDeserializer());
                simpleModule.addSerializer(String.class, new EmptyStringToNullSerializer());
                jacksonConverter.getObjectMapper().registerModule(simpleModule);
            }
        }
        converters.add(0, new NewznabAndTorznabResponseNamespaceFixer(marshaller()));
    }


    private static class NewznabAndTorznabResponseNamespaceFixer implements HttpMessageConverter<Object> {

        private final Jaxb2Marshaller marshaller;
        private final MappingJackson2HttpMessageConverter jacksonConverter = new MappingJackson2HttpMessageConverter();


        public NewznabAndTorznabResponseNamespaceFixer(Jaxb2Marshaller marshaller) {
            this.marshaller = marshaller;
        }

        @Override
        public boolean canRead(Class<?> clazz, MediaType mediaType) {
            return false;
        }

        @Override
        public boolean canWrite(Class<?> clazz, MediaType mediaType) {
            return NewznabResponse.class.isAssignableFrom(clazz);
        }

        @Override
        public List<MediaType> getSupportedMediaTypes() {
            return Arrays.asList(MediaType.APPLICATION_XML, MediaType.APPLICATION_RSS_XML, MediaType.APPLICATION_ATOM_XML);
        }

        @Override
        public Object read(Class<?> clazz, HttpInputMessage inputMessage) throws HttpMessageNotReadableException {
            logger.error("Didn't expect to have to read anything. Implementation error");
            return null;
        }

        @Override
        public void write(Object o, MediaType contentType, HttpOutputMessage outputMessage) throws IOException, HttpMessageNotWritableException {
            NewznabResponse newznabResponse = (NewznabResponse) o;
            if (determineOutputType((NewznabResponse) o) == OutputType.JSON) {
                jacksonConverter.setPrettyPrint(true);
                jacksonConverter.write(o, MediaType.APPLICATION_JSON, outputMessage);
            } else {
                outputMessage.getHeaders().setContentType(MediaType.APPLICATION_XML);
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                marshaller.marshal(newznabResponse, new StreamResult(bos));
                String result;
                String originalXml = bos.toString(StandardCharsets.UTF_8);
                if (newznabResponse.getSearchType() == NewznabResponse.SearchType.TORZNAB) {
                    result = originalXml.replace("xmlns:newznab=\"http://www.newznab.com/DTD/2010/feeds/attributes/\"", "");
                } else {
                    result = originalXml.replace("xmlns:torznab=\"http://torznab.com/schemas/2015/feed\"", "");
                }
                result = result.replace("<searchType>TORZNAB</searchType>", "").replace("<searchType>NEWZNAB</searchType>", "");
                outputMessage.getBody().write(result.getBytes(StandardCharsets.UTF_8));
            }
        }

        private OutputType determineOutputType(NewznabResponse o) {
            NewznabResponse.SearchType searchType = o.getSearchType();
            OutputType outputType;
            if (searchType != null) {
                if (searchType == NewznabResponse.SearchType.JSON) {
                    outputType = OutputType.JSON;
                } else {
                    outputType = OutputType.XML;
                }
            } else {
                outputType = SessionStorage.outputType.get();
            }
            return outputType;
        }


    }


}
