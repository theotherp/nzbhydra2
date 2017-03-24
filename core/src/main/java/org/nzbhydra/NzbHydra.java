package org.nzbhydra;

import com.google.common.base.Joiner;
import com.google.common.collect.Iterables;
import org.nzbhydra.api.CategoryConverter;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.rssmapping.RssRoot;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchModuleConfigProvider;
import org.nzbhydra.searching.infos.InfoProvider;
import org.nzbhydra.searching.infos.TmdbHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.WebSocketAutoConfiguration;
import org.springframework.boot.system.ApplicationPidFileWriter;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.guava.GuavaCacheManager;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

//@SpringBootApplication
@Configuration
@EnableAutoConfiguration(exclude = {WebSocketAutoConfiguration.class, AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
@RestController
@EnableCaching
public class NzbHydra {

    private static final Logger log = LoggerFactory.getLogger(NzbHydra.class);

    public static String[] originalArgs;

    List<SearchResultEntity> results = new ArrayList<>();
    private static ConfigurableApplicationContext applicationContext;


    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;

    @Autowired
    CategoryProvider categoryProvider;

    @Autowired
    InfoProvider infoProvider;

    @Autowired
    private TmdbHandler tmdbHandler;

    @Autowired
    CategoryConverter categoryConverter; //Needed to be autowired so the provider in it is initialized


    public static void main(String[] args) {
        SpringApplication hydraApplication = new SpringApplication(NzbHydra.class);
        hydraApplication.addListeners(new ApplicationPidFileWriter());
        NzbHydra.originalArgs = args;
        applicationContext = hydraApplication.run(args);
    }

    @Bean
    public CacheManager getCacheManager() {
        GuavaCacheManager guavaCacheManager = new GuavaCacheManager("infos", "titles");
        return guavaCacheManager;
    }

    @RequestMapping(value = "/rss")
    public RssRoot get() {
        RestTemplate restTemplate = new RestTemplate();
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
        File pidFile = new File("nzbhydra.pid");
        if (!pidFile.exists()) {
            return "PID file " + pidFile.getAbsolutePath() + " does not exist";
        }
        List<String> updaterArgsList = new ArrayList<>();
        updaterArgsList.add("java"); //TODO Remove with configurable
        updaterArgsList.add("-jar");
        updaterArgsList.add("c:\\Users\\strat\\IdeaProjects\\NzbHydra2\\updater\\target\\updater-1.0-SNAPSHOT-jar-with-dependencies.jar");
        updaterArgsList.add(pidFile.getAbsolutePath());
        updaterArgsList.add("java");
        updaterArgsList.add("-jar");
        updaterArgsList.add("c:\\Users\\strat\\IdeaProjects\\NzbHydra2\\core\\target\\core-0.0.1-SNAPSHOT.jar");

        updaterArgsList.addAll(Arrays.asList(originalArgs));

        System.out.println(Joiner.on(" ").join(updaterArgsList));

//        ProcessResult processResult = future.get();
//        System.out.println(processResult.outputString());

        Runtime.getRuntime().exec(Iterables.toArray(updaterArgsList, String.class));
        applicationContext.registerShutdownHook();
        System.exit(0);

//
//        BufferedReader stdInput = new BufferedReader(new
//                InputStreamReader(proc.getInputStream()));
//
//        BufferedReader stdError = new BufferedReader(new
//                InputStreamReader(proc.getErrorStream()));
//
//// read the output from the command
//        System.out.println("Here is the standard output of the command:\n");
//        String s = null;
//        while ((s = stdInput.readLine()) != null) {
//            System.out.println(s);
//        }
//
//// read any errors from the attempted command
//        System.out.println("Here is the standard error of the command (if any):\n");
//        while ((s = stdError.readLine()) != null) {
//            System.out.println(s);
//        }

        return "Ok";
    }


    @RequestMapping("/testconfig")
    public String testconfig() {
        return searchModuleConfigProvider.getIndexers().get(0).getName();
    }


}
