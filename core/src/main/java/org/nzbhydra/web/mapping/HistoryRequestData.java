package org.nzbhydra.web.mapping;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class HistoryRequestData {

    private boolean distinct;
    private boolean onlyCurrentUser;
    private int page;
    private int limit;
    private FilterModel filterModel;
    private SortModel sortModel;
}
