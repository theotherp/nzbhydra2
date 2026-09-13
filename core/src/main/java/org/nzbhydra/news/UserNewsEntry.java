package org.nzbhydra.news;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserNewsEntry {
    private String id;
    private String title;
    private String body;
    /**
     * Entries marked as admin only are only returned for users that may see the admin area (which is the case for
     * every user when no auth is configured).
     */
    private boolean adminOnly;
}
