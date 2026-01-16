

package org.nzbhydra.searching.db;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.LazyCollection;
import org.hibernate.annotations.LazyCollectionOption;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.springnative.ReflectionMarker;
import org.nzbhydra.web.SessionStorage;

import java.time.Instant;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;


@Data
@ReflectionMarker
@Entity
@Table(name = "search")
public final class SearchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @SequenceGenerator(allocationSize = 1, name = "SEARCH_SEQ")
    private int id;

    @Enumerated(EnumType.STRING)
    private SearchSource source;
    @Enumerated(EnumType.STRING)
    private SearchType searchType;
    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
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

    private String username;
    private String ip;
    private String userAgent;

    public SearchEntity() {
        time = Instant.now();
        this.username = SessionStorage.username.get();
        this.userAgent = SessionStorage.userAgent.get();
        this.ip = SessionStorage.IP.get();
    }

    @JsonIgnore
    public boolean equalsSearchEntity(SearchEntity that) {
        return Objects.equals(categoryName, that.categoryName) &&
                Objects.equals(query, that.query) &&
                Objects.equals(identifiers, that.identifiers) &&
                Objects.equals(season, that.season) &&
                Objects.equals(episode, that.episode) &&
                Objects.equals(title, that.title) &&
                Objects.equals(author, that.author);
    }

    @JsonIgnore
    public int getComparingHash() {
        return Objects.hash(getQuery(), getCategoryName(), getSeason(), getEpisode(), getTitle(), identifiers);
    }


}
