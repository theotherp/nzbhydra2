package org.nzbhydra.config.safeconfig;

import lombok.Data;
import org.nzbhydra.config.Category;

//Only needed because I can't convince Thymeleaf to serialize enums as their names
@Data
public class SafeCategory {

    private final boolean mayBeSelected;
    private final String name;
    private final String pretty;
    private final boolean supportsById;

    public SafeCategory(Category category) {
        this.mayBeSelected = category.isMayBeSelected();
        this.name = category.getName();
        this.pretty = category.getPretty();
        this.supportsById = category.isSupportyById();
    }

}
