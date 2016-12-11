package org.nzbhydra;

import org.nzbhydra.api.CategoryConverter;
import org.nzbhydra.database.IndexerRepository;
import org.nzbhydra.database.SearchResultEntity;
import org.nzbhydra.database.SearchResultRepository;
import org.nzbhydra.mapping.RssRoot;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.CategoryProvider;
import org.nzbhydra.searching.SearchModuleConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.autoconfigure.websocket.WebSocketAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

//@SpringBootApplication
@Configuration
@EnableAutoConfiguration(exclude = {WebSocketAutoConfiguration.class, AopAutoConfiguration.class, org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration.class})
@ComponentScan
public class CoreApplication {

    private static final Logger log = LoggerFactory.getLogger(CoreApplication.class);

    List<SearchResultEntity> results = new ArrayList<>();


    @Autowired
    private SearchResultRepository searchResultRepository;

    @Autowired
    private IndexerRepository indexerRepository;

    @Autowired
    private SearchModuleConfigProvider searchModuleConfigProvider;

    @Autowired
    CategoryProvider categoryProvider;

    @Autowired
    CategoryConverter categoryConverter; //Needed to be autowired so the provider in it is initialized


    public static void main(String[] args) {

        SpringApplication.run(CoreApplication.class, args);

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



    @RequestMapping("/testconfig")
    public String test() {
        return searchModuleConfigProvider.getIndexers().get(0).getName();
    }


    @RequestMapping("/")
    public String index() {


        return "Greetings from Spring Boot!";
    }

}
