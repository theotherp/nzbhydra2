package org.nzbhydra.misc;

import org.nzbhydra.config.ConfigProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.awt.*;
import java.net.URI;

@Component
public class BrowserOpener {

    private static final Logger logger = LoggerFactory.getLogger(BrowserOpener.class);

    @Autowired
    private ConfigProvider configProvider;

    public void openBrowser() {
        Desktop desktop = null;
        try {
            desktop = Desktop.isDesktopSupported() ? Desktop.getDesktop() : null;
        } catch (Exception e) {
            logger.debug("Unable to get desktop");
        }
        URI uri = configProvider.getBaseConfig().getBaseUriBuilder().build().toUri();
        if (desktop != null && desktop.isSupported(Desktop.Action.BROWSE)) {
            logger.info("Opening {} in browser", uri);
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
