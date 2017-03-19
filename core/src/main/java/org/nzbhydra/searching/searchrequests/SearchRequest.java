package org.nzbhydra.searching.searchrequests;

import lombok.Data;
import net.karneim.pojobuilder.GeneratePojoBuilder;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.SearchType;

import java.util.List;
import java.util.Objects;

@Data
@GeneratePojoBuilder
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


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SearchRequest that = (SearchRequest) o;
        return internal == that.internal &&
                searchType == that.searchType &&
                Objects.equals(category, that.category) &&
                Objects.equals(minsize, that.minsize) &&
                Objects.equals(maxsize, that.maxsize) &&
                Objects.equals(minage, that.minage) &&
                Objects.equals(maxage, that.maxage) &&
                Objects.equals(query, that.query) &&
                Objects.equals(identifierKey, that.identifierKey) &&
                Objects.equals(identifierValue, that.identifierValue) &&
                Objects.equals(title, that.title) &&
                Objects.equals(season, that.season) &&
                Objects.equals(episode, that.episode) &&
                Objects.equals(author, that.author);
    }

    @Override
    public int hashCode() {
        return Objects.hash(internal, searchType, category, minsize, maxsize, minage, maxage, query, identifierKey, identifierValue, title, season, episode, author);
    }
}
