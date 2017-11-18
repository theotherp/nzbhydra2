package org.nzbhydra.tests;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriver;
import org.openqa.selenium.phantomjs.PhantomJSDriverService;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
public class WebDriverConfiguration {

    private final static String PHANTJOMJS = "c:\\programme\\phantomjs-2.1.1-windows\\bin\\phantomjs.exe";
    private final static String CHROMEDRIVER = "c:\\programme\\chromedriver\\chromedriver.exe";

    private static final Logger logger = LoggerFactory.getLogger(WebDriverConfiguration.class);

    @Bean
    @Profile("!dev")
    public WebDriver getPhantomJsWebDriver() {
        logger.info("Creating PhantomJS web driver");
        DesiredCapabilities caps = new DesiredCapabilities();
        caps.setJavascriptEnabled(true);
        caps.setCapability("takesScreenshot", true);
        String phantomJsPath = PHANTJOMJS;
        if (System.getProperty("phantomjsbin") != null) {
            phantomJsPath = System.getProperty("phantomjsbin");
            logger.info("Using phantomJs bin {} from environment", phantomJsPath);
        } else {
            logger.info("Using default phantomJs bin {}", phantomJsPath);
        }
        caps.setCapability(
                PhantomJSDriverService.PHANTOMJS_EXECUTABLE_PATH_PROPERTY, phantomJsPath);
        return new PhantomJSDriver(caps);
    }

    @Bean
    @Profile("dev")
    protected ChromeDriver initializeChromeDriver() {
        logger.info("Creating chrome web driver");
        System.setProperty("webdriver.chrome.driver", CHROMEDRIVER);
        return new ChromeDriver();
    }

}
