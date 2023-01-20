package org.nzbhydra.fortests;

import lombok.Builder;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.List;

@Data
@ReflectionMarker
@Builder
public class NewznabItemData {

    private String title;
    private String description;
    private String link;
    private String category;
    private List<Integer> newznabCategories;
    private Long size;
    private Instant pubDate;
    private String group;
    private String poster;


}
