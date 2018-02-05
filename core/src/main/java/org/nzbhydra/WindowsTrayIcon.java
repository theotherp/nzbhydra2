package org.nzbhydra;

import org.nzbhydra.misc.BrowserOpener;
import org.nzbhydra.update.UpdateManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.context.ConfigurableApplicationContext;

import javax.swing.*;
import java.awt.*;

//Mostly taken from https://stackoverflow.com/a/44452260
public class WindowsTrayIcon extends TrayIcon {

    private static final Logger logger = LoggerFactory.getLogger(WindowsTrayIcon.class);

    private static final String IMAGE_PATH = "/nzbhydra.png";
    private static final String TOOLTIP = "NZBHydra 2";
    private PopupMenu popup;
    private static SystemTray tray;
    private static WindowsTrayIcon instance;

    public WindowsTrayIcon() {
        super(new ImageIcon(WindowsTrayIcon.class.getResource(IMAGE_PATH), TOOLTIP).getImage(), TOOLTIP);
        try {
            popup = new PopupMenu();
            tray = SystemTray.getSystemTray();
            instance = this;
            setup();
        } catch (AWTException e) {
            logger.error("Unable to create tray icon", e);
        }
    }

    private void setup() throws AWTException {
        MenuItem openBrowserItem = new MenuItem("Open web UI");
        popup.add(openBrowserItem);
        openBrowserItem.addActionListener(e -> {
            try {
                NzbHydra.getApplicationContext().getAutowireCapableBeanFactory().createBean(BrowserOpener.class).openBrowser();
            } catch (NullPointerException | IllegalStateException | BeansException e1) {
                logger.error("Unable to open browser. Process may not have started completely");
            }
        });

        MenuItem restartItem = new MenuItem("Restart");
        popup.add(restartItem);
        restartItem.addActionListener(e -> {
            ((ConfigurableApplicationContext) NzbHydra.getApplicationContext()).close();
            remove();
            System.exit(UpdateManager.RESTART_RETURN_CODE);
        });

        MenuItem shutdownItem = new MenuItem("Shutdown");
        popup.add(shutdownItem);
        shutdownItem.addActionListener(e -> {
            try {
                ((ConfigurableApplicationContext) NzbHydra.getApplicationContext()).close();
            } catch (Exception e1) {
                logger.error("Error while closing application context, will shut down hard");
            } finally {
                remove();
            }
            System.exit(UpdateManager.SHUTDOWN_RETURN_CODE);
        });


        setPopupMenu(popup);
        tray.add(this);
    }

    public static void remove() {
        if (tray != null && instance != null) {
            logger.info("Removing tray icon");
            tray.remove(instance);
            tray = null;
        }
    }

}
