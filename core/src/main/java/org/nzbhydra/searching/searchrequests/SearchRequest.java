package org.nzbhydra.searching.searchrequests;

import lombok.Builder;
import lombok.Data;
import lombok.ToString;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.SearchType;

import java.util.List;

@Data
@ToString
@Builder
public class SearchRequest {

    protected List<String> indexers;
    protected boolean internal;
    protected SearchType searchType;
    protected Category category;
    protected Integer offset = 0;
    protected Integer limit = 100;
    protected Integer minsize;
    protected Integer maxsize;
    protected Integer minage;
    protected Integer maxage;

    protected String query;

    protected String identifierKey;
    protected String identifierValue;
    protected String title;
    protected Integer season;
    protected Integer episode;
    protected String author;


}
