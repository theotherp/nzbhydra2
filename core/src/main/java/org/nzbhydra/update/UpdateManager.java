package org.nzbhydra.update;


import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Joiner;
import com.vladsch.flexmark.ast.Node;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.options.MutableDataSet;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Request.Builder;
import okhttp3.Response;
import org.nzbhydra.update.gtihubmapping.Release;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
public class UpdateManager implements InitializingBean {

    private static final Logger logger = LoggerFactory.getLogger(UpdateManager.class);

    @Value("${nzbhydra.repositoryBaseUrl}")
    protected String repositoryBaseUrl;

    @Value("${nzbhydra.changelogUrl}")
    protected String changelogUrl;

    protected String currentVersionString = "0.0.1"; //TODO FIll with version from pom.properties, see http://stackoverflow.com/questions/3886753/access-maven-project-version-in-spring-config-files
    protected SemanticVersion currentVersion;

    protected OkHttpClient client = new OkHttpClient();
    protected Instant lastCheckedForNewVersion = Instant.ofEpochMilli(0L);
    private SemanticVersion latestVersion;
    private ObjectMapper objectMapper;

    public UpdateManager() {
        objectMapper = new ObjectMapper();
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);
    }

    public boolean isUpdateAvailable() throws UpdateException {
        return getLatestVersion().isUpdateFor(currentVersion);
    }

    public String getLatestVersionString() throws UpdateException {
        return getLatestVersion().toString();
    }

    public String getCurrentVersionString() {
        return currentVersionString;
    }

    /**
     * Returns the full content of the changelog.md formatted as HTML
     *
     * @return HTML formatted changelog
     * @throws UpdateException Unable to reach GitHub or parse data
     */
    public String getFullChangelog() throws UpdateException {
        Request request = new Builder().url(changelogUrl).build();
        try {
            Response response = client.newCall(request).execute();
            if (!response.isSuccessful()) {
                throw new UpdateException("Error while getting changelog from GitHub: " + response.message());
            }
            return response.body().string();
        } catch (IOException e) {
            throw new UpdateException("Error while getting changelog from GitHub", e);
        }
    }

    /**
     * Returns all changes from releases after the current one as formatted HTML
     *
     * @return HTML with the markdown from the release bodies rendered and separated with <hr>
     * @throws UpdateException Unable to reach github or parse the output
     */
    public String getChangesSince() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases";
            logger.debug("Loading changes since current version {} from GitHub using URL", currentVersion, url);
            Request request = new Builder().url(url).build();
            Response response = client.newCall(request).execute();
            String responseBody = response.body().string();
            List<Release> releases = objectMapper.readValue(responseBody, new TypeReference<List<Release>>() {
            });
            releases.sort((o1, o2) -> {
                try {
                    //Newest version first
                    return new SemanticVersion(o2.getTagName()).compareTo(new SemanticVersion(o1.getTagName()));
                } catch (ParseException e) {
                    logger.error("Error comparing versions {} and {}", o1, o2);
                    return 0;
                }
            });
            List<String> collectedVersionChanges = new ArrayList<>();
            for (Release release : releases) {
                if (new SemanticVersion(release.getTagName()).equals(currentVersion)) {
                    break;
                }
                collectedVersionChanges.add("## " + release.getTagName() + "\r\n" + release.getBody());
            }
            String allChanges = Joiner.on("\r\n***\r\n").join(collectedVersionChanges);

            String html = renderMarkdownAsHtml(allChanges);
            return html;
        } catch (IOException | ParseException e) {
            throw new UpdateException("Error while getting changelog", e);
        }
    }


    public boolean downloadUpdate() {
        return true;
    }

    public void installUpdate() throws IOException {

    }

    private SemanticVersion getLatestVersion() throws UpdateException {
        try {
            if (Instant.now().minus(15, ChronoUnit.MINUTES).isAfter(lastCheckedForNewVersion)) {
                Release latestRelease = getLatestRelease();
                latestVersion = new SemanticVersion(latestRelease.getTagName());
                lastCheckedForNewVersion = Instant.now();
            }
            return latestVersion;
        } catch (ParseException e) {
            throw new UpdateException("Error while getting latest version", e);
        }
    }

    private Release getLatestRelease() throws UpdateException {
        try {
            String url = repositoryBaseUrl + "/releases/latest";
            logger.debug("Retrieving latest release from GitHub using URL {}", url);
            Request request = new Builder().url(url).build();
            Response response = client.newCall(request).execute();
            String responseBody = response.body().string();
            return objectMapper.readValue(responseBody, Release.class);
        } catch (IOException e) {
            throw new UpdateException("Error while getting latest version", e);
        }
    }


    private String renderMarkdownAsHtml(String markdown) {
        MutableDataSet options = new MutableDataSet();
        Parser parser = Parser.builder(options).build();
        HtmlRenderer renderer = HtmlRenderer.builder(options).build();
        Node document = parser.parse(markdown);
        return renderer.render(document);
    }


    @Override
    public void afterPropertiesSet() throws Exception {
        currentVersion = new SemanticVersion(currentVersionString);
    }
}
