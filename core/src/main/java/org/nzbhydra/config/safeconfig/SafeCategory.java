package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.springnative.ReflectionMarker;

//Only needed because I can't convince Thymeleaf to serialize enums as their names
@Data
@ReflectionMarker
public class SafeCategory {

    private final boolean mayBeSelected;
    private final String name;
    private final String searchType;
    private final String ignoreResultsFrom;
    private final boolean preselect;
    private final Integer maxSizePreset;
    private final Integer minSizePreset;

    public SafeCategory(Category category) {
        this.mayBeSelected = category.isMayBeSelected();
        this.name = category.getName();
        this.searchType = category.getSearchType().name();
        this.ignoreResultsFrom = category.getIgnoreResultsFrom().name();
        this.preselect = category.isPreselect();
        this.minSizePreset = category.getMinSizePreset().orElse(null);
        this.maxSizePreset = category.getMaxSizePreset().orElse(null);
    }

}
