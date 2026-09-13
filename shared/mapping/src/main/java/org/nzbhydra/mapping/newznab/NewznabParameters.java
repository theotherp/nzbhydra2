package org.nzbhydra.mapping.newznab;

import com.google.common.base.MoreObjects;
import com.google.common.base.Objects;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class NewznabParameters {

    @Schema(description = "The API key from the main configuration. Required unless the instance runs without one.")
    private String apikey;

    @Schema(description = "What to do: search, tvsearch, movie, book, audio, caps, get, details, getnfo or stats.", example = "tvsearch")
    private ActionAttribute t;

    @Schema(description = "The search string.", example = "example show")
    private String q;

    @Schema(description = "Newznab category IDs to search in, comma separated.", example = "[5030, 5040]")
    private List<Integer> cat = new ArrayList<>();

    @Schema(description = "TVRage ID of the series to search for.")
    private String rid;
    @Schema(description = "TVDB ID of the series to search for.", example = "0000000")
    private String tvdbid;
    @Schema(description = "TVMaze ID of the series to search for.")
    private String tvmazeid;
    private String traktId; //LATER implement?
    @Schema(description = "IMDb ID of the movie to search for, without the leading tt.", example = "0000000")
    private String imdbid;
    @Schema(description = "TMDb ID of the movie to search for.", example = "0000000")
    private String tmdbid;
    @Schema(description = "The season to search for, for tvsearch.", example = "1")
    private Integer season;
    @Schema(description = "The episode to search for, for tvsearch.", example = "1")
    private String ep;
    @Schema(description = "The author to search for, for book searches.", example = "Ex Ample")
    private String author;
    @Schema(description = "The title to search for instead of a query.", example = "Example Show")
    private String title;

    @Schema(description = "How many results to skip, for paging.", example = "0")
    private Integer offset = 0;
    @Schema(description = "How many results to return at most.", example = "100")
    private Integer limit = 100;
    @Schema(description = "Minimum age of the results in days.", example = "0")
    private Integer minage;
    @Schema(description = "Maximum age of the results in days.", example = "1500")
    private Integer maxage;
    @Schema(description = "Minimum size of the results in megabytes.", example = "100")
    private Integer minsize;
    @Schema(description = "Maximum size of the results in megabytes.", example = "20000")
    private Integer maxsize;

    @Schema(description = "The GUID of a result, for t=get, t=details and t=getnfo.")
    private String id;

    @Schema(description = "Whether the results are returned unprocessed.", example = "false")
    private boolean raw;

    @Schema(description = "The output format: xml (default) or json.", example = "xml")
    private OutputType o = OutputType.XML;

    @Schema(description = "How long a repeated search may be answered from the cache, in minutes.", example = "5")
    private Integer cachetime;

    private Integer password;

    //Not (yet) supported
    @Schema(description = "Not supported, accepted and ignored.")
    private String genre;

    private List<String> attrs = new ArrayList<>();
    @Schema(description = "Whether the extended result attributes are returned.", example = "true")
    private boolean extended;

    //Hydra-specific
    private Set<String> indexers = new HashSet<>();

    @Override
    public String toString() {
        return MoreObjects.toStringHelper(this)
                .add("t", t)
                .add("q", q)
                .add("cat", cat)
                .add("imdbId", imdbid)
                .add("tmdbId", tmdbid)
                .add("tvRageId", rid)
                .add("tvdbId", tvdbid)
                .add("traktId", traktId)
                .add("tvmazeId", tvmazeid)
                .add("season", season)
                .add("ep", ep)
                .add("author", author)
                .add("title", title)
                .add("offset", offset)
                .add("limit", limit)
                .add("maxage", maxage)
                .add("id", id)
                .add("raw", raw)
                .add("o", o)
                .add("genre", genre)
                .add("attrs", attrs)
                .add("extended", extended)
                .add("cachetime", cachetime)
                .add("password", password)
                .add("indexers", indexers)
                .omitNullValues()
                .toString();
    }

    @Override
    public boolean equals(Object o1) {
        if (this == o1) {
            return true;
        }
        if (o1 == null || getClass() != o1.getClass()) {
            return false;
        }
        if (!super.equals(o1)) {
            return false;
        }
        NewznabParameters that = (NewznabParameters) o1;
        return raw == that.raw &&
                extended == that.extended &&
                Objects.equal(apikey, that.apikey) &&
                t == that.t &&
                Objects.equal(q, that.q) &&
                Objects.equal(cat, that.cat) &&
                Objects.equal(rid, that.rid) &&
                Objects.equal(tvdbid, that.tvdbid) &&
                Objects.equal(tvmazeid, that.tvmazeid) &&
                Objects.equal(traktId, that.traktId) &&
                Objects.equal(imdbid, that.imdbid) &&
                Objects.equal(tmdbid, that.tmdbid) &&
                Objects.equal(season, that.season) &&
                Objects.equal(ep, that.ep) &&
                Objects.equal(author, that.author) &&
                Objects.equal(title, that.title) &&
                Objects.equal(offset, that.offset) &&
                Objects.equal(limit, that.limit) &&
                Objects.equal(minage, that.minage) &&
                Objects.equal(maxage, that.maxage) &&
                Objects.equal(minsize, that.minsize) &&
                Objects.equal(maxsize, that.maxsize) &&
                Objects.equal(id, that.id) &&
                o == that.o &&
                Objects.equal(cachetime, that.cachetime) &&
                Objects.equal(genre, that.genre) &&
                Objects.equal(password, that.password) &&
                Objects.equal(attrs, that.attrs);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(apikey, t, q, cat, rid, tvdbid, tvmazeid, traktId, imdbid, tmdbid, season, ep, author, title, offset, limit, minage, maxage, minsize, maxsize, id, raw, o, cachetime, genre, attrs, extended, password);
    }

    public int cacheKey(NewznabResponse.SearchType searchType) {
        return Objects.hashCode(toString() + searchType);
    }
}
