package org.nzbhydra.downloader.sabnzbd;

import com.google.common.base.Strings;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.downloader.Downloader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class Sabnzbd extends Downloader {

    @Autowired
    private RestTemplate restTemplate;

    private UriComponentsBuilder getBaseUrl() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(downloaderConfig.getUrl()).pathSegment("api");
        if (!Strings.isNullOrEmpty(downloaderConfig.getApiKey())) {
            builder.queryParam("apikey", downloaderConfig.getApiKey());
        }
        builder.queryParam("output", "json");
        return builder;
    }

    @Override
    public boolean addLink(String url, String title, String category) {
        if (!title.toLowerCase().endsWith(".nzbd")) {
            title += ".nzb";
        }
        UriComponentsBuilder urlBuilder = getBaseUrl();
        urlBuilder.queryParam("mode", "addurl").queryParam("name", url).queryParam("nzbname", title);
        if (!Strings.isNullOrEmpty(category)) {
            urlBuilder.queryParam("cat", category);
        }
        ResponseEntity<AddNzbResponse> response = restTemplate.exchange(urlBuilder.toUriString(), HttpMethod.GET, null, AddNzbResponse.class);
        response.getStatusCode().is2xxSuccessful();
        return response.getBody().isStatus();
    }

    @Override
    public boolean addNzb(String fileContent, String title, String category) {
        UriComponentsBuilder urlBuilder = getBaseUrl();
        urlBuilder.queryParam("mode", "addfile").queryParam("nzbname", title);
        if (!Strings.isNullOrEmpty(category)) {
            urlBuilder.queryParam("cat", category);
        }
        Map<String, String> postData = new HashMap<>();
        postData.put("name", fileContent);
        ResponseEntity<AddNzbResponse> response = restTemplate.postForEntity(urlBuilder.build().toUri(), postData, AddNzbResponse.class);
        response.getStatusCode().is2xxSuccessful();
        return response.getBody().isStatus();
    }


    @Override
    public GenericResponse checkConnection() {
        try {
            restTemplate.exchange(getBaseUrl().queryParam("mode", "get_cats").toUriString(), HttpMethod.GET, null, CategoriesResponse.class);
            return new GenericResponse(true, null);
        } catch (RestClientException e) {
            return new GenericResponse(false, e.getMessage());
        }
    }

    @Override
    public List<String> getCategories() {
        UriComponentsBuilder uriBuilder = getBaseUrl().queryParam("mode", "get_cats");
        return restTemplate.getForObject(uriBuilder.build().toUri(), CategoriesResponse.class).getCategories();
    }

}
