package org.nzbhydra.logging;

import org.slf4j.Marker;
import org.slf4j.MarkerFactory;

public class LoggingMarkers {

    public static final Marker TRAILING = MarkerFactory.getMarker("TRAILING");
    public static final Marker RESULT_ACCEPTOR = MarkerFactory.getMarker("RESULT_ACCEPTOR");
    public static final Marker PERFORMANCE = MarkerFactory.getMarker("PERFORMANCE");
    public static final Marker DUPLICATES = MarkerFactory.getMarker("DUPLICATES");


}
