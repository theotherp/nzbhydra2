package org.nzbhydra.searching;

import org.nzbhydra.database.SearchResultEntity;

import javax.persistence.Transient;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class SearchResultItem extends SearchResultEntity implements Comparable<SearchResultItem> {

    @Transient
    private Integer indexerScore;
    @Transient
    private Instant pubDate;
    @Transient
    private boolean agePrecise;
    @Transient
    private Long size;
    @Transient
    private String description;
    @Transient
    private String poster;
    @Transient
    private String group;
    @Transient
    private Map<String, String> attributes = new HashMap<>();


    @Override
    public int compareTo(SearchResultItem o) {
        int scoreComparison = Integer.compare(indexerScore, o.getIndexerScore());
        if (scoreComparison != 0) {
            return scoreComparison;
        }
        return pubDate.compareTo(o.getPubDate());
    }

    public Integer getIndexerScore() {
        return indexerScore;
    }

    public void setIndexerScore(Integer indexerScore) {
        this.indexerScore = indexerScore;
    }

    public Instant getPubDate() {
        return pubDate;
    }

    public void setPubDate(Instant pubDate) {
        this.pubDate = pubDate;
    }

    public boolean isAgePrecise() {
        return agePrecise;
    }

    public void setAgePrecise(boolean agePrecise) {
        this.agePrecise = agePrecise;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPoster() {
        return poster;
    }

    public void setPoster(String poster) {
        this.poster = poster;
    }

    public String getGroup() {
        return group;
    }

    public void setGroup(String group) {
        this.group = group;
    }

    public Map<String, String> getAttributes() {
        return attributes;
    }

    public void setAttributes(Map<String, String> attributes) {
        this.attributes = attributes;
    }
}
