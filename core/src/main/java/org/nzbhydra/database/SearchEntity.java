package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.api.CategoryConverter;
import org.nzbhydra.config.Category;
import org.nzbhydra.searching.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.AccessSource;

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
import java.util.ArrayList;
import java.util.List;


@Data
@Entity
@Table(name = "search")
public class SearchEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private int id;
    @Enumerated(EnumType.STRING)
    private AccessSource source;
    @Convert(converter = CategoryConverter.class)
    private Category category;
    private String query;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time;
    @OneToMany(cascade = CascadeType.ALL)
    private List<IdentifierKeyValuePair> identifiers = new ArrayList<>();
    private Integer season;
    private Integer episode;
    @Enumerated(EnumType.STRING)
    private SearchType searchType;
    private String username;
    private String title;
    private String author;

    public SearchEntity() {
        time = Instant.now();
    }
}
