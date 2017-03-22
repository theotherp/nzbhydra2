package org.nzbhydra.web.searching.mapping;

import lombok.Getter;

@Getter
public class SearchResult {

    private String age;
    private Integer ageDays;
    private String category;
    private String title;
    private Integer hash;
    private String indexer;
    private String indexerscore;
    private String link;
    private Integer searchResultId;
    private String size;
    private String downloadType;
    private Integer epoch;
    private String pubdate_utc;
    private Boolean age_precise;
    private String indexerguid;
    private Integer has_nfo;
    private String details_link;
    private Integer dbsearchid;
    private Integer comments;
    private Integer grabs;
    private Integer files;

    public SearchResult setAge(String age) {
        this.age = age;
        return this;
    }

    public SearchResult setAgeDays(Integer ageDays) {
        this.ageDays = ageDays;
        return this;
    }

    public SearchResult setCategory(String category) {
        this.category = category;
        return this;
    }

    public SearchResult setTitle(String title) {
        this.title = title;
        return this;
    }

    public SearchResult setHash(Integer hash) {
        this.hash = hash;
        return this;
    }

    public SearchResult setIndexer(String indexer) {
        this.indexer = indexer;
        return this;
    }

    public SearchResult setIndexerscore(String indexerscore) {
        this.indexerscore = indexerscore;
        return this;
    }

    public SearchResult setLink(String link) {
        this.link = link;
        return this;
    }

    public SearchResult setSearchResultId(Integer searchResultId) {
        this.searchResultId = searchResultId;
        return this;
    }

    public SearchResult setSize(String size) {
        this.size = size;
        return this;
    }

    public SearchResult setDownloadType(String downloadType) {
        this.downloadType = downloadType;
        return this;
    }

    public SearchResult setEpoch(Integer epoch) {
        this.epoch = epoch;
        return this;
    }

    public SearchResult setPubdate_utc(String pubdate_utc) {
        this.pubdate_utc = pubdate_utc;
        return this;
    }

    public SearchResult setAge_precise(Boolean age_precise) {
        this.age_precise = age_precise;
        return this;
    }

    public SearchResult setIndexerguid(String indexerguid) {
        this.indexerguid = indexerguid;
        return this;
    }

    public SearchResult setHas_nfo(Integer has_nfo) {
        this.has_nfo = has_nfo;
        return this;
    }

    public SearchResult setDetails_link(String details_link) {
        this.details_link = details_link;
        return this;
    }

    public SearchResult setDbsearchid(Integer dbsearchid) {
        this.dbsearchid = dbsearchid;
        return this;
    }

    public SearchResult setComments(Integer comments) {
        this.comments = comments;
        return this;
    }

    public SearchResult setGrabs(Integer grabs) {
        this.grabs = grabs;
        return this;
    }

    public SearchResult setFiles(Integer files) {
        this.files = files;
        return this;
    }
}
