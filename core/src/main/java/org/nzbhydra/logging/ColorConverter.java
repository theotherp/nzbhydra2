package org.nzbhydra.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import org.springframework.boot.ansi.AnsiColor;
import org.springframework.boot.ansi.AnsiElement;
import org.springframework.boot.ansi.AnsiStyle;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class ColorConverter extends org.springframework.boot.logging.logback.ColorConverter {

    private static final Map<String, AnsiElement> ELEMENTS;

    static {
        Map<String, AnsiElement> elements = new HashMap<>();
        elements.put("faint", AnsiStyle.FAINT);
        elements.put("red", AnsiColor.RED);
        elements.put("green", AnsiColor.GREEN);
        elements.put("yellow", AnsiColor.YELLOW);
        elements.put("blue", AnsiColor.BLUE);
        elements.put("magenta", AnsiColor.MAGENTA);
        elements.put("cyan", AnsiColor.CYAN);
        elements.put("blue", AnsiColor.BLUE);
        ELEMENTS = Collections.unmodifiableMap(elements);
    }

    private static final Map<Integer, AnsiElement> LEVELS;

    static {
        Map<Integer, AnsiElement> levels = new HashMap<>();
        levels.put(Level.DEBUG_INTEGER, AnsiColor.BLUE); //Only change in implementation, use different color for debug
        levels.put(Level.ERROR_INTEGER, AnsiColor.RED);
        levels.put(Level.WARN_INTEGER, AnsiColor.YELLOW);
        LEVELS = Collections.unmodifiableMap(levels);
    }

    @Override
    protected String transform(ILoggingEvent event, String in) {
        AnsiElement element = ELEMENTS.get(getFirstOption());
        if (element == null) {
            // Assume highlighting
            element = LEVELS.get(event.getLevel().toInteger());
            element = (element == null ? AnsiColor.GREEN : element);
        }
        return toAnsiString(in, element);
    }
}
