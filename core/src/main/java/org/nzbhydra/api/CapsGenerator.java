/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.api;

import com.google.common.collect.Sets;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.config.category.Category;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.config.mediainfo.MediaIdType;
import org.nzbhydra.mapping.newznab.ActionAttribute;
import org.nzbhydra.mapping.newznab.NewznabResponse;
import org.nzbhydra.mapping.newznab.OutputType;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonCategoriesHolder;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonCategory;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonCategoryAttributes;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonIdAttributes;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonLimits;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonLimitsAttributes;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonRegistration;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonRegistrationAttributes;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonRoot;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonSearchIdAttributesHolder;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonSearching;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonServer;
import org.nzbhydra.mapping.newznab.json.caps.CapsJsonServerAttributes;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategories;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlCategory;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlLimits;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRetention;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlRoot;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlSearch;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlSearching;
import org.nzbhydra.mapping.newznab.xml.caps.CapsXmlServer;
import org.nzbhydra.mediainfo.InfoProvider;
import org.nzbhydra.update.UpdateManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class CapsGenerator {

    @Autowired
    private UpdateManager updateManager;
    @Autowired
    private ConfigProvider configProvider;

    ResponseEntity<?> getCaps(OutputType o, NewznabResponse.SearchType searchType) {
        if (o == OutputType.XML) {
            return getXmlCaps(searchType == NewznabResponse.SearchType.TORZNAB);
        } else {
            return getJsonCaps(searchType == NewznabResponse.SearchType.TORZNAB);
        }
    }

    private ResponseEntity<?> getJsonCaps(boolean torznabCall) {
        CapsXmlRoot xmlCapsRoot = getXmlCapsRoot(torznabCall);
        CapsJsonRoot capsRoot = new CapsJsonRoot();
        capsRoot.setLimits(new CapsJsonLimits(new CapsJsonLimitsAttributes(String.valueOf(xmlCapsRoot.getLimits().getMax()), String.valueOf(xmlCapsRoot.getLimits().getDefaultValue()))));
        capsRoot.setRegistration(new CapsJsonRegistration(new CapsJsonRegistrationAttributes("no", "no")));
        CapsJsonServerAttributes serverAttributes = new CapsJsonServerAttributes();
        serverAttributes.setAppversion(updateManager.getCurrentVersionString());
        serverAttributes.setVersion(updateManager.getCurrentVersionString());
        serverAttributes.setEmail(xmlCapsRoot.getServer().getEmail());
        serverAttributes.setTitle(xmlCapsRoot.getServer().getTitle());
        serverAttributes.setUrl(xmlCapsRoot.getServer().getUrl());
        serverAttributes.setImage(xmlCapsRoot.getServer().getImage());
        capsRoot.setServer(new CapsJsonServer(serverAttributes));
        CapsJsonSearchIdAttributesHolder searchAttributes = new CapsJsonSearchIdAttributesHolder(new CapsJsonIdAttributes(xmlCapsRoot.getSearching().getSearch().getAvailable(), xmlCapsRoot.getSearching().getSearch().getSupportedParams()));
        CapsJsonSearchIdAttributesHolder tvSearchAttributes = new CapsJsonSearchIdAttributesHolder(new CapsJsonIdAttributes(xmlCapsRoot.getSearching().getTvSearch().getAvailable(), xmlCapsRoot.getSearching().getTvSearch().getSupportedParams()));
        CapsJsonSearchIdAttributesHolder movieSearchAttributes = new CapsJsonSearchIdAttributesHolder(new CapsJsonIdAttributes(xmlCapsRoot.getSearching().getMovieSearch().getAvailable(), xmlCapsRoot.getSearching().getMovieSearch().getSupportedParams()));
        CapsJsonSearchIdAttributesHolder audioSearchAttributes = new CapsJsonSearchIdAttributesHolder(new CapsJsonIdAttributes(xmlCapsRoot.getSearching().getAudioSearch().getAvailable(), xmlCapsRoot.getSearching().getAudioSearch().getSupportedParams()));
        CapsJsonSearchIdAttributesHolder bookSearchAttributes = new CapsJsonSearchIdAttributesHolder(new CapsJsonIdAttributes(xmlCapsRoot.getSearching().getBookSearch().getAvailable(), xmlCapsRoot.getSearching().getBookSearch().getSupportedParams()));
        capsRoot.setSearching(new CapsJsonSearching(searchAttributes, tvSearchAttributes, movieSearchAttributes, audioSearchAttributes, bookSearchAttributes));

        List<CapsJsonCategory> categories = new ArrayList<>();
        for (CapsXmlCategory xmlCategory : xmlCapsRoot.getCategories().getCategories()) {
            List<CapsJsonCategory> subCategories = new ArrayList<>();
            for (CapsXmlCategory xmlSubCategory : xmlCategory.getSubCategories()) {
                subCategories.add(new CapsJsonCategory(new CapsJsonCategoryAttributes(String.valueOf(xmlCategory.getId()), xmlSubCategory.getName())));
            }
            categories.add(new CapsJsonCategory(new CapsJsonCategoryAttributes(String.valueOf(xmlCategory.getId()), xmlCategory.getName()), subCategories));
        }

        capsRoot.setCategories(new CapsJsonCategoriesHolder(categories));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new ResponseEntity<>(capsRoot, headers, HttpStatus.OK);
    }

    private ResponseEntity<?> getXmlCaps(boolean torznabCall) {
        CapsXmlRoot capsRoot = getXmlCapsRoot(torznabCall);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_XML);
        return new ResponseEntity<>(capsRoot, headers, HttpStatus.OK);
    }

    private CapsXmlRoot getXmlCapsRoot(boolean torznabCall) {
        CapsXmlRoot capsRoot = new CapsXmlRoot();
        capsRoot.setRetention(new CapsXmlRetention(3000));
        capsRoot.setLimits(new CapsXmlLimits(100, 100));

        CapsXmlServer capsServer = new CapsXmlServer();
        capsServer.setEmail("theotherp@posteo.net");
        capsServer.setTitle("NZBHydra 2");
        capsServer.setUrl("https://github.com/theotherp/nzbhydra2");
        capsServer.setImage("https://raw.githubusercontent.com/theotherp/nzbhydra2/master/core/ui-src/img/banner-bright.png");
        capsRoot.setServer(capsServer);

        CapsXmlSearching capsSearching = new CapsXmlSearching();
        capsSearching.setSearch(new CapsXmlSearch("yes", "q,cat,limit,offset,minage,maxage,minsize,maxsize"));

        String tvSupportedParams = "q,season,ep,cat,limit,offset,minage,maxage,minsize,maxsize";
        tvSupportedParams = addIdIfSupported(tvSupportedParams, MediaIdType.TVRAGE, "rid", torznabCall);
        tvSupportedParams = addIdIfSupported(tvSupportedParams, MediaIdType.TVDB, "tvdbid", torznabCall);
        tvSupportedParams = addIdIfSupported(tvSupportedParams, MediaIdType.TVMAZE, "tvmazeid", torznabCall);
        tvSupportedParams = addIdIfSupported(tvSupportedParams, MediaIdType.TVIMDB, "imdbid", torznabCall);
        tvSupportedParams = addIdIfSupported(tvSupportedParams, MediaIdType.TRAKT, "traktid", torznabCall);
        capsSearching.setTvSearch(new CapsXmlSearch("yes", tvSupportedParams));

        String supportedMovieParams = "q,cat,limit,offset,minage,maxage,minsize,maxsize";
        supportedMovieParams = addIdIfSupported(supportedMovieParams, MediaIdType.IMDB, "imdbid", torznabCall);
        supportedMovieParams = addIdIfSupported(supportedMovieParams, MediaIdType.TMDB, "tmdbid", torznabCall);
        capsSearching.setMovieSearch(new CapsXmlSearch("yes", supportedMovieParams));

        capsSearching.setBookSearch(new CapsXmlSearch("yes", "q,author,title,cat,limit,offset,minage,maxage,minsize,maxsize"));
        capsSearching.setAudioSearch(new CapsXmlSearch("no", ""));
        capsRoot.setSearching(capsSearching);

        capsRoot.setCategories(getCapsXmlCategories());
        return capsRoot;
    }

    private String addIdIfSupported(String tvSupportedParams, MediaIdType idType, String id, boolean torznabCall) {
        boolean anyQueryGenerationPossible = configProvider.getBaseConfig().getSearching().getGenerateQueries() != SearchSourceRestriction.NONE || configProvider.getBaseConfig().getSearching().getIdFallbackToQueryGeneration() == SearchSourceRestriction.API;
        if (anyQueryGenerationPossible) {
            tvSupportedParams += "," + id;
            return tvSupportedParams;
        }

        boolean supportedByAnyIndexer = configProvider.getBaseConfig().getIndexers().stream().anyMatch(x -> {
            if (x.getState() != IndexerConfig.State.ENABLED && x.getState() != IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY) {
                return false;
            }
            if (!SearchSource.API.meets(x.getEnabledForSearchSource())) {
                //Indexer will not be picked for API searches
                return false;
            }
            if (Sets.intersection(new HashSet<>(x.getSupportedSearchIds()), InfoProvider.getConvertibleFrom(idType)).isEmpty()) {
                //Indexer does not support the ID type or any of the ones the ID type can potentially be converted to
                return false;
            }
            if (!x.getSupportedSearchTypes().contains(ActionAttribute.TVSEARCH) && InfoProvider.TV_ID_TYPES.contains(idType)) {
                //Indexer doesn't allow TV searches but this is a TV ID
                return false;
            }
            if (!x.getSupportedSearchTypes().contains(ActionAttribute.MOVIE) && InfoProvider.MOVIE_ID_TYPES.contains(idType)) {
                //Indexer doesn't allow movie searches but this is a movie ID
                return false;
            }
            if (torznabCall) {
                return x.getSearchModuleType() == SearchModuleType.TORZNAB;
            } else {
                return true;
            }

        });
        if (supportedByAnyIndexer) {
            tvSupportedParams += "," + id;
            return tvSupportedParams;
        }
        return tvSupportedParams;
    }

    CapsXmlCategories getCapsXmlCategories() {
        if (configProvider.getBaseConfig().getSearching().isTransformNewznabCategories()) {
            Map<Integer, CapsXmlCategory> mainXmlCategoriesMap = new HashMap<>();
            Set<String> alreadyAdded = new HashSet<>();
            for (Category category : configProvider.getBaseConfig().getCategoriesConfig().getCategories()) {
                category.getNewznabCategories().stream().flatMap(Collection::stream).sorted(Comparator.naturalOrder()).filter(x -> x % 1000 == 0).forEach(x -> {
                    CapsXmlCategory xmlCategory = new CapsXmlCategory(x, category.getName(), new ArrayList<>());
                    mainXmlCategoriesMap.put(x, xmlCategory);
                    alreadyAdded.add(category.getName());
                });
            }
            for (Category category : configProvider.getBaseConfig().getCategoriesConfig().getCategories()) {
                List<Integer> subCategories = category.getNewznabCategories().stream().flatMap(Collection::stream).filter(x -> x % 1000 != 0)
                    //Lower numbers first so that predefined category numbers take precedence over custom ones
                    .sorted(Comparator.naturalOrder())
                    .toList();
                //Use lowest category first
                for (Integer subCategory : subCategories) {
                    if (alreadyAdded.contains(category.getName())) {
                        continue;
                    }
                    int itsMainCategoryNumber = subCategory / 1000 * 1000;
                    if (mainXmlCategoriesMap.containsKey(itsMainCategoryNumber)) {
                        //Assign this category to existing main category
                        boolean alreadyPresent = mainXmlCategoriesMap.get(itsMainCategoryNumber).getSubCategories().stream().anyMatch(x -> x.getName().equals(category.getName()));
                        if (!alreadyPresent) {
                            mainXmlCategoriesMap.get(itsMainCategoryNumber).getSubCategories().add(new CapsXmlCategory(subCategory, category.getName(), new ArrayList<>()));
                        }
                    } else {
                        mainXmlCategoriesMap.put(subCategory, new CapsXmlCategory(subCategory, category.getName(), new ArrayList<>()));
                    }
                    alreadyAdded.add(category.getName());
                }
            }

            ArrayList<CapsXmlCategory> categories = new ArrayList<>(mainXmlCategoriesMap.values());
            categories.sort(Comparator.comparing(CapsXmlCategory::getId));
            return new CapsXmlCategories(categories);
        } else {
            List<CapsXmlCategory> mainCategories = new ArrayList<>();
            mainCategories.add(new CapsXmlCategory(1000, "Console", Arrays.asList(
                    new CapsXmlCategory(1010, "NDS"),
                    new CapsXmlCategory(1020, "PSP"),
                    new CapsXmlCategory(1030, "Wii"),
                    new CapsXmlCategory(1040, "XBox"),
                    new CapsXmlCategory(1050, "Xbox 360"),
                    new CapsXmlCategory(1060, "Wiiware"),
                    new CapsXmlCategory(1070, "Xbox 360 DLC")
            )));
            mainCategories.add(new CapsXmlCategory(2000, "Movies", Arrays.asList(
                    new CapsXmlCategory(2010, "Foreign"),
                    new CapsXmlCategory(2020, "Other"),
                    new CapsXmlCategory(2030, "SD"),
                    new CapsXmlCategory(2040, "HD"),
                    new CapsXmlCategory(2045, "UHD"),
                    new CapsXmlCategory(2050, "Bluray"),
                    new CapsXmlCategory(2060, "3D")
            )));
            mainCategories.add(new CapsXmlCategory(3000, "Audio", Arrays.asList(
                    new CapsXmlCategory(3010, "MP3"),
                    new CapsXmlCategory(3020, "Video"),
                    new CapsXmlCategory(3030, "Audiobook"),
                    new CapsXmlCategory(3040, "Lossless")
            )));
            mainCategories.add(new CapsXmlCategory(4000, "PC", Arrays.asList(
                    new CapsXmlCategory(4010, "0day"),
                    new CapsXmlCategory(4020, "ISO"),
                    new CapsXmlCategory(4030, "Mac"),
                    new CapsXmlCategory(4040, "Mobile Oher"),
                    new CapsXmlCategory(4050, "Games"),
                    new CapsXmlCategory(4060, "Mobile IOS"),
                    new CapsXmlCategory(4070, "Mobile Android")
            )));
            mainCategories.add(new CapsXmlCategory(5000, "TV", Arrays.asList(
                    new CapsXmlCategory(5020, "Foreign"),
                    new CapsXmlCategory(5030, "SD"),
                    new CapsXmlCategory(5040, "HD"),
                    new CapsXmlCategory(5045, "UHD"),
                    new CapsXmlCategory(5050, "Other"),
                    new CapsXmlCategory(5060, "Sport"),
                    new CapsXmlCategory(5070, "Anime"),
                    new CapsXmlCategory(5080, "Documentary")
            )));
            mainCategories.add(new CapsXmlCategory(6000, "XXX", Arrays.asList(
                    new CapsXmlCategory(6010, "DVD"),
                    new CapsXmlCategory(6020, "WMV"),
                    new CapsXmlCategory(6030, "XviD"),
                    new CapsXmlCategory(6040, "x264"),
                    new CapsXmlCategory(6050, "Pack"),
                    new CapsXmlCategory(6060, "Imgset"),
                    new CapsXmlCategory(6070, "Other")
            )));
            mainCategories.add(new CapsXmlCategory(7000, "Books", Arrays.asList(
                    new CapsXmlCategory(7010, "Mags"),
                    new CapsXmlCategory(7020, "Ebook"),
                    new CapsXmlCategory(7030, "COmics")
            )));
            mainCategories.add(new CapsXmlCategory(8000, "Other", Arrays.asList(
                    new CapsXmlCategory(8010, "Misc")
            )));
            return new CapsXmlCategories(mainCategories);
        }

    }
}
