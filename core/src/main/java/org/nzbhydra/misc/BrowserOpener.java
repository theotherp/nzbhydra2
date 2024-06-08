package org.nzbhydra.misc;

import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.awt.Desktop;
import java.net.URI;

@Component
public class BrowserOpener {

    private static final Logger logger = LoggerFactory.getLogger(BrowserOpener.class);

    @Autowired
    private UrlCalculator urlCalculator;

    public void openBrowser() {
        Desktop desktop;
        URI uri = urlCalculator.getLocalBaseUriBuilder().build().toUri();
        try {
            logger.debug("Desktop supported: {}", Desktop.isDesktopSupported());
            desktop = Desktop.isDesktopSupported() ? Desktop.getDesktop() : null;
        } catch (Throwable e) {
            logger.debug("Unable to get desktop", e);
            logger.error("Unable to open browser. Go to {}", uri, e);
            return;
        }
        if (desktop != null && desktop.isSupported(Desktop.Action.BROWSE)) {
            logger.info("Opening {} in browser", uri);
            try {
                desktop.browse(uri);
            } catch (Exception e) {
                logger.error("Unable to open browser. Go to {}", uri, e);
            }
        } else {
            logger.error("Unable to open browser. Go to {}", uri);
        }
    }

}
