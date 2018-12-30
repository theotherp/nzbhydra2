package org.nzbhydra.logging;

import org.slf4j.Marker;
import org.slf4j.MarkerFactory;

public class LoggingMarkers {

    public static final Marker TRAILING = MarkerFactory.getMarker("TRAILING");
    public static final Marker RESULT_ACCEPTOR = MarkerFactory.getMarker("RESULT_ACCEPTOR");
    public static final Marker PERFORMANCE = MarkerFactory.getMarker("PERFORMANCE");
    public static final Marker DUPLICATES = MarkerFactory.getMarker("DUPLICATES");
    public static final Marker USER_AGENT = MarkerFactory.getMarker("USER_AGENT");
    public static final Marker SCHEDULER = MarkerFactory.getMarker("SCHEDULER");
    public static final Marker DOWNLOAD_STATUS_UPDATE = MarkerFactory.getMarker("DOWNLOAD_STATUS_UPDATE");
    public static final Marker URL_CALCULATION = MarkerFactory.getMarker("URL_CALCULATION");
    public static final Marker HTTP = MarkerFactory.getMarker("HTTP");
    public static final Marker HISTORY_CLEANUP = MarkerFactory.getMarker("HISTORY_CLEANUP");
    public static final Marker CONFIG_READ_WRITE = MarkerFactory.getMarker("CONFIG_READ_WRITE");
}
