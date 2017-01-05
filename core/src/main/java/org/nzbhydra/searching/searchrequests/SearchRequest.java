package org.nzbhydra.searching.searchrequests;

import lombok.Data;
import lombok.ToString;
import net.karneim.pojobuilder.GeneratePojoBuilder;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.SearchType;

import java.util.List;

@Data
@ToString
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

        if (internal != that.internal) return false;
        if (searchType != that.searchType) return false;
        if (category != null ? !category.equals(that.category) : that.category != null) return false;
        if (minsize != null ? !minsize.equals(that.minsize) : that.minsize != null) return false;
        if (maxsize != null ? !maxsize.equals(that.maxsize) : that.maxsize != null) return false;
        if (minage != null ? !minage.equals(that.minage) : that.minage != null) return false;
        if (maxage != null ? !maxage.equals(that.maxage) : that.maxage != null) return false;
        if (query != null ? !query.equals(that.query) : that.query != null) return false;
        if (identifierKey != null ? !identifierKey.equals(that.identifierKey) : that.identifierKey != null)
            return false;
        if (identifierValue != null ? !identifierValue.equals(that.identifierValue) : that.identifierValue != null)
            return false;
        if (title != null ? !title.equals(that.title) : that.title != null) return false;
        if (season != null ? !season.equals(that.season) : that.season != null) return false;
        if (episode != null ? !episode.equals(that.episode) : that.episode != null) return false;
        return author != null ? author.equals(that.author) : that.author == null;
    }

    @Override
    public int hashCode() {
        int result = (internal ? 1 : 0);
        result = 31 * result + (searchType != null ? searchType.hashCode() : 0);
        result = 31 * result + (category != null ? category.hashCode() : 0);
        result = 31 * result + (minsize != null ? minsize.hashCode() : 0);
        result = 31 * result + (maxsize != null ? maxsize.hashCode() : 0);
        result = 31 * result + (minage != null ? minage.hashCode() : 0);
        result = 31 * result + (maxage != null ? maxage.hashCode() : 0);
        result = 31 * result + (query != null ? query.hashCode() : 0);
        result = 31 * result + (identifierKey != null ? identifierKey.hashCode() : 0);
        result = 31 * result + (identifierValue != null ? identifierValue.hashCode() : 0);
        result = 31 * result + (title != null ? title.hashCode() : 0);
        result = 31 * result + (season != null ? season.hashCode() : 0);
        result = 31 * result + (episode != null ? episode.hashCode() : 0);
        result = 31 * result + (author != null ? author.hashCode() : 0);
        return result;
    }
}
