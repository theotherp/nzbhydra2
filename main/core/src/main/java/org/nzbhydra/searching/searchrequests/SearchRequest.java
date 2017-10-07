package org.nzbhydra.searching.searchrequests;

import com.google.common.base.Joiner;
import com.google.common.base.MoreObjects;
import com.google.common.base.Strings;
import lombok.Data;
import org.nzbhydra.config.Category;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.searching.DownloadType;
import org.nzbhydra.searching.SearchType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Data
public class SearchRequest {

    public enum SearchSource {
        INTERNAL,
        API
    }

    private static final Logger logger = LoggerFactory.getLogger(SearchRequest.class);

    private static final Pattern EXCLUSION_PATTERN = Pattern.compile("[\\s|\b](\\-\\-|!)(?<term>\\w+)");

    protected Set<String> indexers = null;
    protected SearchSource source;
    protected SearchType searchType = SearchType.SEARCH;
    protected Category category = new Category();
    protected Integer offset = 0;
    protected Integer limit = 100;
    protected boolean loadAll;
    protected Integer minsize = null;
    protected Integer maxsize = null;
    protected Integer minage = null;
    protected Integer maxage = null;

    protected String query;
    protected Map<InfoProvider.IdType, String> identifiers = new HashMap<>();
    protected String title;
    protected Integer season;
    protected String episode;
    protected String author = null;
    protected long searchRequestId;
    private DownloadType downloadType = DownloadType.NZB;

    private InternalData internalData = new InternalData();

    public SearchRequest(SearchSource source, SearchType searchType, Integer offset, Integer limit) {
        this.source = source;
        this.searchType = searchType;
        this.offset = offset == null ? 0 : offset;
        this.limit = limit == null ? 100 : limit; //LATER Set to 100 or, better, make configurable for internal/external searches
    }

    public Optional<Set<String>> getIndexers() {
        return Optional.ofNullable(indexers);
    }

    public Optional<Integer> getOffset() {
        return Optional.ofNullable(offset);
    }

    public Optional<Integer> getLimit() {
        return Optional.ofNullable(limit);
    }

    public Optional<Integer> getMinsize() {
        return Optional.ofNullable(minsize);
    }

    public Optional<Integer> getMaxsize() {
        return Optional.ofNullable(maxsize);
    }

    public Optional<Integer> getMinage() {
        return Optional.ofNullable(minage);
    }

    public Optional<Integer> getMaxage() {
        return Optional.ofNullable(maxage);
    }

    public Optional<String> getQuery() {
        return Optional.ofNullable(query);
    }

    public Optional<String> getTitle() {
        return Optional.ofNullable(title);
    }

    public Optional<Integer> getSeason() {
        return Optional.ofNullable(season);
    }

    public Optional<String> getEpisode() {
        return Optional.ofNullable(episode);
    }

    public Optional<String> getAuthor() {
        return Optional.ofNullable(author);
    }


    public SearchRequest extractForbiddenWords() {
        if (Strings.isNullOrEmpty(query)) {
            return this;
        }
        Matcher matcher = EXCLUSION_PATTERN.matcher(query);
        Set<String> exclusions = new HashSet<>();
        while (matcher.find()) {
            exclusions.add(matcher.group("term"));
        }
        query = matcher.replaceAll("");
        internalData.getForbiddenWords().addAll(exclusions);
        if (!exclusions.isEmpty()) {
            logger.debug("Extracted excluded words \"{}\" from query, leaving \"{}\" as qeuery", Joiner.on(", ").join(exclusions), query);
        }
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
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
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
