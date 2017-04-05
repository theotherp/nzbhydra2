package org.nzbhydra.downloader;

import com.google.common.io.BaseEncoding;
import com.googlecode.jsonrpc4j.JsonRpcHttpClient;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.downloader.exceptions.DownloaderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.MalformedURLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class NzbGet extends Downloader {

    private static final Logger logger = LoggerFactory.getLogger(NzbGet.class);
    private JsonRpcHttpClient client;

    //TODO Handle username / password and failed auth, return codes

    @Override
    public void intialize(DownloaderConfig downloaderConfig) {
        super.intialize(downloaderConfig);
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(downloaderConfig.getUrl());
            builder.path("jsonrpc");
            client = new JsonRpcHttpClient(builder.build().toUri().toURL());
        } catch (MalformedURLException e) {
            throw new RuntimeException("Unable to create URL from configuration: " + e.getMessage());
        }
    }

    @Override
    public GenericResponse checkConnection() {
        try {
            boolean successful = client.invoke("writelog", new Object[]{"INFO", "NZBHydra connected to test connection"}, Boolean.class);
            logger.info("Connection check to NZBGet using URL {} successful", downloaderConfig.getUrl());
            return new GenericResponse(successful, null);
        } catch (Throwable e) {
            logger.error("Connection check to NZBGet using URL {} failed", downloaderConfig.getUrl());
            return new GenericResponse(false, e.getMessage());
        }
    }

    @Override
    public List<String> getCategories() {
        List<String> categories = new ArrayList<>();
        try {
            ArrayList<LinkedHashMap<String, String>> config = client.invoke("config", null, ArrayList.class);
            //Returned is a list of HashMaps with two entries: "Name" -> "<ConfigOptionName>" and "Value" -> "<ConfigOptionValue>"
            //For categories the name of the config option looks like "Category1.Name"
            categories = config.stream().filter(pair -> pair.containsKey("Name") && pair.get("Name").contains("Category") && pair.get("Name").contains("Name")).map(pair -> pair.get("Value")).collect(Collectors.toList());
        } catch (Throwable throwable) {
            logger.error("Error while trying to get categories from NZBGet: {}", throwable.getMessage());
        }
        return categories;
    }

    @Override
    public void addLink(String link, String title, String category) throws DownloaderException {
        try {
            callAppend(link, title, category);
            logger.error("Successfully added link {} for NZB \"{}\" to NZBGet queue", link, title);
        } catch (Throwable throwable) {
            logger.error("Error while trying to add link {} for NZB \"{}\" to NZBGet queue: {}", link, title, throwable.getMessage());
        }
    }

    @Override
    public void addNzb(String content, String title, String category) throws DownloaderException {
        try {
            callAppend(BaseEncoding.base64().encode(content.getBytes()), title, category);
            logger.error("Successfully added link {} for NZB \"{}\" to NZBGet queue", content, title);
        } catch (Throwable throwable) {
            logger.error("Error while trying to add link {} for NZB \"{}\" to NZBGet queue: {}", content, title, throwable.getMessage());
        }
    }

    private void callAppend(String contentOrLink, String title, String category) throws Throwable {
        String nzbName = title;
        if (!nzbName.toLowerCase().endsWith(".nzb")) {
            nzbName += ".nzb";
        }
        category = category == null ? "" : category;
        //int append(string NZBFilename, string NZBContent, string Category, int Priority, bool AddToTop, bool AddPaused, string DupeKey, int DupeScore, string DupeMode, array PPParameters)
        Object[] arguments = new Object[]{nzbName, contentOrLink, category, 0, false, false, "", 0, "SCORE", new Object[]{}};
        int nzbId = client.invoke("append", arguments, Integer.class);
        if (nzbId <= 0) {
            throw new DownloaderException("NZBGet returned error code. Check its logs");
        }
    }


}
