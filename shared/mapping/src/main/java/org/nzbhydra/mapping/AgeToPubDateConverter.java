

package org.nzbhydra.mapping;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class AgeToPubDateConverter {

    static Clock clock = Clock.systemUTC();

    public static Instant convertToInstant(String ageString) {
        // Define regex to match the age string
        Pattern pattern = Pattern.compile("(\\d+)([smhd])");
        Matcher matcher = pattern.matcher(ageString);

        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid age string format: " + ageString);
        }

        // Extract the quantity and time unit
        int quantity = Integer.parseInt(matcher.group(1));
        String unit = matcher.group(2).toLowerCase();

        // Determine the duration to subtract
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime result = switch (unit) {
            case "s" -> now.minusSeconds(quantity);
            case "m" -> now.minusMinutes(quantity);
            case "h" -> now.minusHours(quantity);
            case "d" -> now.minusDays(quantity);
            default -> throw new IllegalArgumentException("Unsupported time unit: " + unit);
        };

        return result.toInstant(ZoneOffset.UTC);
    }
}
