package org.nzbhydra.fortests;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class NewznabItem {

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
