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

import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.mapping.newznab.xml.NewznabAttribute;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlChannel;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlEnclosure;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlGuid;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlItem;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlResponse;
import org.nzbhydra.mapping.newznab.xml.NewznabXmlRoot;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class NewznabXmlTransformer {

    private static final String APPLICATION_TYPE_NZB = "application/x-nzb";
    private static final String APPLICATION_TYPE_TORRENT = "application/x-bittorrent";

    @Autowired
    protected FileHandler nzbHandler;
    @Autowired
    protected ConfigProvider configProvider;

    NewznabXmlRoot getRssRoot(List<SearchResultItem> searchResultItems, Integer offset, int total, SearchRequest searchRequest) {
        NewznabXmlRoot rssRoot = new NewznabXmlRoot();

        NewznabXmlChannel rssChannel = new NewznabXmlChannel();
        rssChannel.setTitle("NZBHydra 2");
        rssChannel.setLink("https://www.github.com/theotherp/nzbhydra2");
        rssChannel.setWebMaster("theotherp@posteo.net");
        if (searchRequest.getDownloadType() == org.nzbhydra.searching.dtoseventsenums.DownloadType.NZB) {
            rssChannel.setNewznabResponse(new NewznabXmlResponse(offset == null ? 0 : offset, total));
        }
        rssChannel.setGenerator("NZBHydra2");

        rssRoot.setRssChannel(rssChannel);
        List<NewznabXmlItem> items = new ArrayList<>();
        for (SearchResultItem searchResultItem : searchResultItems) {
            NewznabXmlItem rssItem = buildRssItem(searchResultItem, searchRequest);
            items.add(rssItem);
        }

        rssChannel.setItems(items);
        return rssRoot;
    }

    NewznabXmlItem buildRssItem(SearchResultItem searchResultItem, SearchRequest searchRequest) {
        NewznabXmlItem rssItem = new NewznabXmlItem();
        boolean isNzb = searchRequest.getDownloadType() == org.nzbhydra.searching.dtoseventsenums.DownloadType.NZB;
        String link = nzbHandler.getDownloadLink(searchResultItem.getSearchResultId(), false, isNzb ? DownloadType.NZB : DownloadType.TORRENT);
        rssItem.setLink(link);
        rssItem.setTitle(searchResultItem.getTitle());
        rssItem.setRssGuid(new NewznabXmlGuid(String.valueOf(searchResultItem.getGuid()), false));
        rssItem.setSize(searchResultItem.getSize());
        if (searchResultItem.getPubDate() != null) {
            rssItem.setPubDate(searchResultItem.getPubDate());
        } else {
            rssItem.setPubDate(searchResultItem.getBestDate()); //Contain usenet date because results with neither should've been
        }
        searchResultItem.getAttributes().put("guid", String.valueOf(searchResultItem.getSearchResultId()));
        List<NewznabAttribute> newznabAttributes = searchResultItem.getAttributes().entrySet().stream().map(attribute -> new NewznabAttribute(attribute.getKey(), attribute.getValue())).sorted(Comparator.comparing(NewznabAttribute::getName)).collect(Collectors.toList());
        newznabAttributes.add(new NewznabAttribute("hydraIndexerScore", String.valueOf(searchResultItem.getIndexer().getConfig().getScore().orElse(null))));
        newznabAttributes.add(new NewznabAttribute("hydraIndexerHost", getIndexerHost(searchResultItem)));
        newznabAttributes.add(new NewznabAttribute("hydraIndexerName", String.valueOf(searchResultItem.getIndexer().getName())));
        String resultType;
        if (isNzb) {
            rssItem.setNewznabAttributes(newznabAttributes);
            resultType = APPLICATION_TYPE_NZB;
        } else {
            rssItem.setTorznabAttributes(newznabAttributes);
            resultType = APPLICATION_TYPE_TORRENT;
        }
        rssItem.setEnclosure(new NewznabXmlEnclosure(link, searchResultItem.getSize(), resultType));
        rssItem.setComments(searchResultItem.getCommentsLink());
        rssItem.setDescription(searchResultItem.getDescription());
        rssItem.setCategory(configProvider.getBaseConfig().getSearching().isUseOriginalCategories() ? searchResultItem.getOriginalCategory() : searchResultItem.getCategory().getName());
        return rssItem;
    }

    private String getIndexerHost(SearchResultItem searchResultItem) {
        try {
            return String.valueOf(new URI(searchResultItem.getIndexer().getConfig().getHost()).getHost());
        } catch (URISyntaxException e) {
            //Should never happen
            return null;
        }
    }
}
