package org.nzbhydra.mapping.newznab;

import com.google.common.base.MoreObjects;
import com.google.common.base.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewznabParameters {

    private String apikey;

    private ActionAttribute t;

    private String q;

    private List<Integer> cat = new ArrayList<>();

    private String rid;
    private String tvdbid;
    private String tvmazeid;
    private String traktId; //LATER implement?
    private String imdbid;
    private String tmdbid;
    private Integer season;
    private String ep;
    private String author;
    private String title;

    @Builder.Default
    private Integer offset = 0;
    @Builder.Default
    private Integer limit = 100;
    private Integer minage;
    private Integer maxage;
    private Integer minsize;
    private Integer maxsize;

    private String id;

    private boolean raw;
    @Builder.Default
    private OutputType o = OutputType.XML;

    private Integer cachetime;

    private Integer password;

    //Not (yet) supported
    private String genre;
    @Builder.Default
    private List<String> attrs = new ArrayList<>();
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
