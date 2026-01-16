

package org.nzbhydra.historystats.stats;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.DayOfWeek;
import java.time.format.TextStyle;
import java.util.Locale;

@Data
@ReflectionMarker
public class CountPerDayOfWeek {
    private String day = null;
    private Integer count = null;

    /**
     * @param dayIndex 1 for "Mon", 2 for "Tue", etc.
     */
    public CountPerDayOfWeek(int dayIndex, Integer counter) {
        this.count = counter;
        day = DayOfWeek.of(dayIndex).getDisplayName(TextStyle.SHORT, Locale.US);
    }

    public CountPerDayOfWeek() {
    }
}
