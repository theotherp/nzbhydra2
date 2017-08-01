package org.nzbhydra.historystats.stats;

import lombok.Data;
import org.nzbhydra.historystats.FilterModel;
import org.nzbhydra.historystats.SortModel;

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
