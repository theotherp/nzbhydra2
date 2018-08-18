/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.searching.db;

import lombok.Data;
import org.hibernate.annotations.LazyCollection;
import org.hibernate.annotations.LazyCollectionOption;
import org.nzbhydra.searching.dtoseventsenums.SearchType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.web.SessionStorage;

import javax.persistence.*;
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


    public boolean equalsSearchEntity(SearchEntity that) {
        return Objects.equals(categoryName, that.categoryName) &&
                Objects.equals(query, that.query) &&
                Objects.equals(identifiers, that.identifiers) &&
                Objects.equals(season, that.season) &&
                Objects.equals(episode, that.episode) &&
                Objects.equals(title, that.title) &&
                Objects.equals(author, that.author);
    }
    
    public int getComparingHash() {
        return Objects.hash(getQuery(), getCategoryName(), getSeason(), getEpisode(), getTitle(), identifiers);
    }


}
