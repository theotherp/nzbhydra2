package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.Category;

//Only needed because I can't convince Thymeleaf to serialize enums as their names
@Data
public class SafeCategory {

    private final boolean mayBeSelected;
    private final String name;
    private final String searchType;
    private final String ignoreResultsFrom;
    private boolean preselect;


    public SafeCategory(Category category) {
        this.mayBeSelected = category.isMayBeSelected();
        this.name = category.getName();
        this.searchType = category.getSearchType().name();
        this.ignoreResultsFrom = category.getIgnoreResultsFrom().name();
        this.preselect = category.isPreselect();
    }

}
