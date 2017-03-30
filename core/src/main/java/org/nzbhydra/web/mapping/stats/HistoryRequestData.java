package org.nzbhydra.web.mapping.stats;

import lombok.Data;
import org.nzbhydra.web.mapping.FilterModel;
import org.nzbhydra.web.mapping.SortModel;

@Data

public class HistoryRequestData {

    private boolean distinct = false;
    private boolean onlyCurrentUser;
    private int page = 1;
    private int limit = 100;
    private FilterModel filterModel = new FilterModel();
    private SortModel sortModel;

    public HistoryRequestData() {
    }

}
