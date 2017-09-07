package org.nzbhydra.searching;

import lombok.Data;
import org.hibernate.annotations.LazyCollection;
import org.hibernate.annotations.LazyCollectionOption;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;

import javax.persistence.CascadeType;
import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;
import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;


@Data
@Entity
@Table(name = "search")
public class SearchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int id;

    @Enumerated(EnumType.STRING)
    private SearchSource source;
    @Enumerated(EnumType.STRING)
    private SearchType searchType;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time;

    @OneToMany(cascade = CascadeType.ALL)
    @LazyCollection(LazyCollectionOption.FALSE)
    private Set<IdentifierKeyValuePair> identifiers = new HashSet<>();
    private String categoryName;
    private String query;
    private Integer season;
    private String episode;
    private String title;
    private String author;

    private String usernameOrIp;
    private String userAgent;

    public SearchEntity() {
        time = Instant.now();
    }


    public boolean equalsSearchEntity(SearchEntity that) {

        return Objects.equals(categoryName, that.categoryName) &&
                Objects.equals(query, that.query) &&
                Objects.equals(identifiers, that.identifiers) &&
                Objects.equals(season, that.season) &&
                Objects.equals(episode, that.episode) &&
                Objects.equals(title, that.title) &&
                Objects.equals(author, that.author);
    }


}
