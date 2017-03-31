package org.nzbhydra.web.mapping;

import lombok.Data;
import org.nzbhydra.config.Category;
import org.nzbhydra.config.SearchingConfig;

import java.util.List;

@Data
public class SafeConfig {

    private List<Category> categories;
    private SearchingConfig searching;

}
