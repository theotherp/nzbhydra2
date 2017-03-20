package org.nzbhydra.database;

import lombok.Data;
import org.nzbhydra.api.CategoryConverter;
import org.nzbhydra.api.EnumDatabaseConverter;
import org.nzbhydra.searching.Category;
import org.nzbhydra.searching.SearchType;

import javax.persistence.*;
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
    private boolean internal;
    @Convert(converter = CategoryConverter.class)
    private Category category;
    private String query;
    @Convert(converter = com.github.marschall.threeten.jpa.InstantConverter.class)
    private Instant time;
    @OneToMany
    private List<IdentifierKeyValuePair> identifiers = new ArrayList<>();
    private Integer season;
    private Integer episode;
    @Convert(converter = EnumDatabaseConverter.class)
    private SearchType searchType;
    private String username;
    private String title;
    private String author;

    public SearchEntity() {
        time = Instant.now();
    }
}
