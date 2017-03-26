package org.nzbhydra.searching.searchrequests;

import com.google.common.base.MoreObjects;
import lombok.Data;
import org.nzbhydra.config.Category;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.infos.InfoProvider;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Data
public class SearchRequest {

    public enum AccessSource {
        INTERNAL,
        API
    }

    private static final Pattern EXCLUSION_PATTERN = Pattern.compile("[\\s|\b](\\-\\-|!)(?<term>\\w+)");

    protected List<String> indexers;
    protected AccessSource source;
    protected SearchType searchType;
    protected Category category;
    protected Integer offset = 0;
    protected Integer limit = 100;
    protected Integer minsize;
    protected Integer maxsize;
    protected Integer minage;
    protected Integer maxage;

    protected String query;
    protected Map<InfoProvider.IdType, String> identifiers = new HashMap<>();
    protected String title;
    protected Integer season;
    protected Integer episode;
    protected String author;

    private InternalData internalData = new InternalData();

    public SearchRequest(SearchType searchType, Integer offset, Integer limit) {
        this.searchType = searchType;
        this.offset = offset == null ? 0 : offset;
        this.limit = limit == null ? 100 : limit;
    }

    public Optional<List<String>> getIndexers() {
        return Optional.ofNullable(indexers);
    }

    public Optional<Integer> getOffset() {
        return Optional.ofNullable(offset);
    }

    public void setOffset(Integer offset) {
        this.offset = offset;
    }

    public Optional<Integer> getLimit() {
        return Optional.ofNullable(limit);
    }

    public void setLimit(Integer limit) {
        this.limit = limit;
    }

    public Optional<Integer> getMinsize() {
        return Optional.ofNullable(minsize);
    }

    public void setMinsize(Integer minsize) {
        this.minsize = minsize;
    }

    public Optional<Integer> getMaxsize() {
        return Optional.ofNullable(maxsize);
    }

    public void setMaxsize(Integer maxsize) {
        this.maxsize = maxsize;
    }

    public Optional<Integer> getMinage() {
        return Optional.ofNullable(minage);
    }

    public void setMinage(Integer minage) {
        this.minage = minage;
    }

    public Optional<Integer> getMaxage() {
        return Optional.ofNullable(maxage);
    }

    public void setMaxage(Integer maxage) {
        this.maxage = maxage;
    }

    public Optional<String> getQuery() {
        return Optional.ofNullable(query);
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public Optional<String> getTitle() {
        return Optional.ofNullable(title);
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Optional<Integer> getSeason() {
        return Optional.ofNullable(season);
    }

    public void setSeason(Integer season) {
        this.season = season;
    }

    public Optional<Integer> getEpisode() {
        return Optional.ofNullable(episode);
    }

    public void setEpisode(Integer episode) {
        this.episode = episode;
    }

    public Optional<String> getAuthor() {
        return Optional.ofNullable(author);
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public SearchRequest extractExcludedWordsFromQuery() {
        Matcher matcher = EXCLUSION_PATTERN.matcher(query);
        Set<String> exclusions = new HashSet<>();
        while (matcher.find()) {
            exclusions.add(matcher.group("term"));
        }
        query = matcher.replaceAll("");
        internalData.getExcludedWords().addAll(exclusions);
        return this;
    }

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("source", source)
                .add("indexers", indexers)
                .add("searchType", searchType)
                .add("category", category.getName())
                .add("offset", offset)
                .add("limit", limit)
                .add("minsize", minsize)
                .add("maxsize", maxsize)
                .add("minage", minage)
                .add("maxage", maxage)
                .add("query", query)
                .add("identifiers", identifiers)
                .add("title", title)
                .add("season", season)
                .add("episode", episode)
                .add("author", author)
                .omitNullValues()
                .toString();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SearchRequest that = (SearchRequest) o;
        return source == that.source &&
                searchType == that.searchType &&
                Objects.equals(category, that.category) &&
                Objects.equals(minsize, that.minsize) &&
                Objects.equals(maxsize, that.maxsize) &&
                Objects.equals(minage, that.minage) &&
                Objects.equals(maxage, that.maxage) &&
                Objects.equals(query, that.query) &&
                Objects.equals(identifiers, that.identifiers) &&
                Objects.equals(title, that.title) &&
                Objects.equals(season, that.season) &&
                Objects.equals(episode, that.episode) &&
                Objects.equals(author, that.author);
    }

    @Override
    public int hashCode() {
        return Objects.hash(source, searchType, category, minsize, maxsize, minage, maxage, query, identifiers, title, season, episode, author);
    }
}
