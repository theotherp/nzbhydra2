package org.nzbhydra;

import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.Category;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.mapping.newznab.RssRoot;
import org.nzbhydra.searching.CategoryProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ExitCodeGenerator;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.WebSocketAutoConfiguration;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.system.ApplicationPidFileWriter;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.guava.GuavaCacheManager;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.EventListener;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.awt.*;
import java.io.IOException;
import java.net.URI;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Configuration
@EnableAutoConfiguration(exclude = {WebSocketAutoConfiguration.class, AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
@RestController
@EnableCaching
public class NzbHydra {

    private static final Logger logger = LoggerFactory.getLogger(NzbHydra.class);

    public static String[] originalArgs;

    private static ConfigurableApplicationContext applicationContext;

    @Autowired
    private BaseConfig baseConfig;
    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerRepository indexerRepository;


    @Autowired
    private CategoryProvider categoryProvider;

    @Autowired
    private RestTemplate restTemplate;



    public static void main(String[] args) {
        SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
        hydraApplication.addListeners(new ApplicationPidFileWriter());
        NzbHydra.originalArgs = args;
        hydraApplication.setHeadless(false); //TODO Check, it's better to run headless
        applicationContext = hydraApplication.run(args);
    }

    public static ApplicationContext getApplicationContext() {
        return applicationContext;
    }

    @EventListener
    private void startupDone(ApplicationReadyEvent event) {
        //TODO: Possible do all the initializing now / listening to this event where we can be sure that all beans have been constructed
        if (baseConfig.getMain().isStartupBrowser()) { //TODO Overwritable per command line
            Desktop desktop = Desktop.isDesktopSupported() ? Desktop.getDesktop() : null;
            URI uri = baseConfig.getBaseUriBuilder().build().toUri();
            logger.info("Opening {} in browser", uri);
            if (desktop != null && desktop.isSupported(Desktop.Action.BROWSE)) {
                try {
                    desktop.browse(uri);
                } catch (Exception e) {
                    logger.error("Unable to open browser", e);
                }
            } else {
                logger.error("Unable to open browser");
            }
        }
    }



    @Bean
    public CacheManager getCacheManager() {
        GuavaCacheManager guavaCacheManager = new GuavaCacheManager("infos", "titles");
        return guavaCacheManager;
    }

    @RequestMapping(value = "/rss")
    public RssRoot get() {
        RssRoot rssRoot = restTemplate.getForObject("http://127.0.0.1:5000/api?apikey=a", RssRoot.class);

        return rssRoot;

    }

    @RequestMapping(value = "/delete")
    public String delete() {
        searchResultRepository.deleteAll();
        indexerRepository.deleteAll();

        return "Ok";
    }

    @RequestMapping(value = "/categories")
    public String getCats() {
        return categoryProvider.getCategories().stream().map(Category::getName).collect(Collectors.joining(","));

    }

    @RequestMapping("/test")
    public String test() throws IOException, ExecutionException, InterruptedException {


        logger.info("Shutting down to execute update");
        SpringApplication.exit(applicationContext, (ExitCodeGenerator) () -> {
            return 1;
        });


        return "Ok";
    }


}
