/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.searching;

import com.google.common.base.Strings;
import org.nzbhydra.config.BaseConfigHandler;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.searching.SavedSearch;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.historystats.SavedSearchRequest;
import org.nzbhydra.searching.db.IdentifierKeyValuePairTO;
import org.nzbhydra.searching.dtoseventsenums.SearchRequestParameters;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
public class SavedSearchesWeb {

    @Autowired
    private ConfigProvider configProvider;
    @Autowired
    private BaseConfigHandler baseConfigHandler;

    @Secured({"ROLE_STATS"})
    @RequestMapping(value = "/internalapi/savedsearches", method = RequestMethod.GET, produces = MediaType.APPLICATION_JSON_VALUE)
    public List<SavedSearch> getSavedSearches() {
        return configProvider.getBaseConfig().getSearching().getSavedSearches();
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/savedsearches/{index}", method = RequestMethod.DELETE)
    public void deleteSearch(@PathVariable int index) {
        List<SavedSearch> savedSearches = configProvider.getBaseConfig().getSearching().getSavedSearches();
        if (index >= 0 && index < savedSearches.size()) {
            savedSearches.remove(index);
            baseConfigHandler.save(true);
        }
    }

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/savedsearches", method = RequestMethod.POST, consumes = MediaType.APPLICATION_JSON_VALUE)
    public void saveSearch(@RequestBody SavedSearchRequest request) {
        if (request == null || request.getRequest() == null) {
            return;
        }
        SearchRequestParameters parameters = request.getRequest();
        SavedSearch savedSearch = toSavedSearch(parameters);
        configProvider.getBaseConfig().getSearching().getSavedSearches().add(savedSearch);
        baseConfigHandler.save(true);
    }

    private SavedSearch toSavedSearch(SearchRequestParameters parameters) {
        SavedSearch savedSearch = new SavedSearch();
        savedSearch.setCategoryName(parameters.getCategory());
        savedSearch.setQuery(parameters.getQuery());
        savedSearch.setSeason(parameters.getSeason());
        savedSearch.setEpisode(parameters.getEpisode());
        savedSearch.setTitle(parameters.getTitle());
        savedSearch.setSearchType(resolveSearchType(parameters.getMode()));
        savedSearch.setIdentifiers(buildIdentifiers(parameters));
        savedSearch.setMinAge(parameters.getMinage());
        savedSearch.setMaxAge(parameters.getMaxage());
        savedSearch.setMinSize(parameters.getMinsize());
        savedSearch.setMaxSize(parameters.getMaxsize());
        return savedSearch;
    }

    private SearchType resolveSearchType(String mode) {
        if (Strings.isNullOrEmpty(mode)) {
            return SearchType.SEARCH;
        }
        try {
            return SearchType.valueOf(mode.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return SearchType.SEARCH;
        }
    }

    private Set<IdentifierKeyValuePairTO> buildIdentifiers(SearchRequestParameters parameters) {
        Set<IdentifierKeyValuePairTO> identifiers = new HashSet<>();
        addIdentifier(identifiers, "TMDB", parameters.getTmdbId());
        addIdentifier(identifiers, "IMDB", parameters.getImdbId());
        addIdentifier(identifiers, "TVDB", parameters.getTvdbId());
        addIdentifier(identifiers, "TVMAZE", parameters.getTvmazeId());
        addIdentifier(identifiers, "TVRAGE", parameters.getTvrageId());
        return identifiers;
    }

    private void addIdentifier(Set<IdentifierKeyValuePairTO> identifiers, String key, String value) {
        if (!Strings.isNullOrEmpty(value)) {
            identifiers.add(new IdentifierKeyValuePairTO(key, value));
        }
    }
}
