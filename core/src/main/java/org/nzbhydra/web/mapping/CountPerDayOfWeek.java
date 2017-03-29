package org.nzbhydra.web.mapping;

import lombok.Data;

import java.time.DayOfWeek;
import java.time.format.TextStyle;
import java.util.Locale;

@Data
public class CountPerDayOfWeek {
    private String day = null;
    private Integer count = null;

    public CountPerDayOfWeek(String dayName, Integer counter) {
        this.day = dayName;
        this.count = counter;
    }

    /**
     * @param dayIndex 1 for "Mon", 2 for "Tue", etc.
     */
    public CountPerDayOfWeek(int dayIndex, Integer counter) {
        this.count = counter;
        day = DayOfWeek.of(dayIndex).getDisplayName(TextStyle.SHORT, Locale.US);
    }
}
