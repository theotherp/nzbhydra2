package org.nzbhydra.web.mapping;

import lombok.Data;

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
