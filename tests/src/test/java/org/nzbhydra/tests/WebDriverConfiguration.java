package org.nzbhydra.tests;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class WebDriverConfiguration {

    private final static String CHROMEDRIVER = "c:\\programme\\chromedriver\\chromedriver.exe";

    private static final Logger logger = LoggerFactory.getLogger(WebDriverConfiguration.class);

    public static WebDriver webDriver;

    @Bean
    @Profile("dev")
    protected ChromeDriver initializeChromeDriver() {
        logger.info("Creating chrome web driver");
        System.setProperty("webdriver.chrome.driver", CHROMEDRIVER);
        ChromeDriver webDriver = new ChromeDriver();
        WebDriverConfiguration.webDriver = webDriver;

        return webDriver;
    }

}
