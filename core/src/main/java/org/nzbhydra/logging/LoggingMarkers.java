package org.nzbhydra.logging;

import org.slf4j.Marker;
import org.slf4j.MarkerFactory;

public class LoggingMarkers {

    public static final Marker CONFIG_READ_WRITE = MarkerFactory.getMarker("CONFIG_READ_WRITE");
    public static final Marker CUSTOM_MAPPING = MarkerFactory.getMarker("CUSTOM_MAPPING");
    public static final Marker DOWNLOADER_STATUS_UPDATE = MarkerFactory.getMarker("DOWNLOADER_STATUS_UPDATE");
    public static final Marker DOWNLOAD_STATUS_UPDATE = MarkerFactory.getMarker("DOWNLOAD_STATUS_UPDATE");
    public static final Marker DUPLICATES = MarkerFactory.getMarker("DUPLICATES");
    public static final Marker EXTERNAL_TOOLS = MarkerFactory.getMarker("EXTERNAL_TOOLS");
    public static final Marker HISTORY_CLEANUP = MarkerFactory.getMarker("HISTORY_CLEANUP");
    public static final Marker HTTP = MarkerFactory.getMarker("HTTP");
    public static final Marker HTTPS = MarkerFactory.getMarker("HTTPS");
    public static final Marker LIMITS = MarkerFactory.getMarker("LIMITS");
    public static final Marker NOTIFICATIONS = MarkerFactory.getMarker("NOTIFICATIONS");
    public static final Marker PERFORMANCE = MarkerFactory.getMarker("PERFORMANCE");
    public static final Marker RESULT_ACCEPTOR = MarkerFactory.getMarker("RESULT_ACCEPTOR");
    public static final Marker SCHEDULER = MarkerFactory.getMarker("SCHEDULER");
    public static final Marker SERVER = MarkerFactory.getMarker("SERVER");
    public static final Marker TRAILING = MarkerFactory.getMarker("TRAILING");
    public static final Marker URL_CALCULATION = MarkerFactory.getMarker("URL_CALCULATION");
    public static final Marker USER_AGENT = MarkerFactory.getMarker("USER_AGENT");
    public static final Marker VIP_EXPIRY = MarkerFactory.getMarker("VIP_EXPIRY");

}
