package org.nzbhydra.downloader;

import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.downloader.sabnzbd.Sabnzbd;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@ConfigurationProperties
@EnableConfigurationProperties
public class DownloaderProvider implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(DownloaderProvider.class);

    private static final Map<String, Class<? extends Downloader>> downloaderClasses = new HashMap<>();

    static {
        downloaderClasses.put("sabnzbd", Sabnzbd.class);
    }

    private List<DownloaderConfig> downloaders;
    @Autowired
    private AutowireCapableBeanFactory beanFactory;


    private HashMap<String, Downloader> downloadersMap = new HashMap<>();

    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        logger.info("Reloading downloaders");
        downloaders = configChangedEvent.getNewConfig().getDownloaders();
        afterPropertiesSet();
    }

    @Override
    public void afterPropertiesSet() {
        if (downloaders != null) {
            List<DownloaderConfig> downloaderConfigs = downloaders;
            downloadersMap.clear();
            for (DownloaderConfig downloaderConfig : downloaderConfigs) {
                Downloader downloader = beanFactory.createBean(downloaderClasses.get(downloaderConfig.getType()));
                downloader.intialize(downloaderConfig);
                downloadersMap.put(downloaderConfig.getName(), downloader);
            }
        } else {
            logger.error("Configuration incomplete, no downloaders found");
        }
    }

    public GenericResponse checkConfig(DownloaderConfig downloaderConfig) {
        Downloader downloader = beanFactory.createBean(downloaderClasses.get(downloaderConfig.getType()));
        downloader.intialize(downloaderConfig);
        return downloader.checkConnection();
    }


    public Downloader getDownloaderByName(String downloaderName) {
        if (!downloadersMap.containsKey(downloaderName)) {
            throw new IllegalArgumentException("Unable to find indexer with name " + downloaderName);
        }
        return downloadersMap.get(downloaderName);
    }

}
