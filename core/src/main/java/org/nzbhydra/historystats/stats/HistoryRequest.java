package org.nzbhydra.historystats.stats;

import lombok.Data;
import org.nzbhydra.historystats.FilterModel;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class HistoryRequest {

    protected boolean distinct = false;
    protected boolean onlyCurrentUser = false;
    protected int page = 1;
    protected int limit = 100;
    protected FilterModel filterModel = new FilterModel();
    protected SortModel sortModel;

    public HistoryRequest() {
    }

}
