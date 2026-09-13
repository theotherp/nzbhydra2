package org.nzbhydra.externalapi;

import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.externalapi.v1.ExternalDownloadHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalIdentifier;
import org.nzbhydra.externalapi.v1.ExternalNotificationHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalPage;
import org.nzbhydra.externalapi.v1.ExternalSearchHistoryEntry;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.searching.db.IdentifierKeyValuePair;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

/**
 * Maps the JPA entities the history returns to the contract classes. The mapping is written out field by field on
 * purpose: a rename in an entity then breaks compilation here instead of silently changing the published API.
 */
@Component
public class ExternalHistoryMapper {

    public ExternalSearchHistoryEntry toSearchEntry(SearchEntity entity) {
        ExternalSearchHistoryEntry entry = new ExternalSearchHistoryEntry();
        entry.setId(entity.getId());
        entry.setTime(entity.getTime());
        entry.setSource(name(entity.getSource()));
        entry.setSearchType(name(entity.getSearchType()));
        entry.setCategory(entity.getCategoryName());
        entry.setQuery(entity.getQuery());
        entry.setTitle(entity.getTitle());
        entry.setAuthor(entity.getAuthor());
        entry.setSeason(entity.getSeason());
        entry.setEpisode(entity.getEpisode());
        entry.setMinAge(entity.getMinAge());
        entry.setMaxAge(entity.getMaxAge());
        entry.setMinSize(entity.getMinSize());
        entry.setMaxSize(entity.getMaxSize());
        entry.setIdentifiers(toIdentifiers(entity.getIdentifiers()));
        entry.setSelectedIndexers(sorted(entity.getSelectedIndexers()));
        entry.setUsername(entity.getUsername());
        entry.setIp(entity.getIp());
        entry.setUserAgent(entity.getUserAgent());
        return entry;
    }

    public ExternalDownloadHistoryEntry toDownloadEntry(FileDownloadEntity entity) {
        ExternalDownloadHistoryEntry entry = new ExternalDownloadHistoryEntry();
        entry.setId(entity.getId());
        entry.setTime(entity.getTime());
        SearchResultEntity searchResult = entity.getSearchResult();
        entry.setTitle(searchResult == null ? null : searchResult.getTitle());
        entry.setIndexer(searchResult == null || searchResult.getIndexer() == null ? null : searchResult.getIndexer().getName());
        //Neither the category nor the size of the result is stored with a download, so both stay null (see the
        //contract class)
        entry.setCategory(null);
        entry.setSizeBytes(null);
        entry.setAgeDays(entity.getAge());
        entry.setAccessType(name(entity.getNzbAccessType()));
        entry.setAccessSource(name(entity.getAccessSource()));
        entry.setStatus(name(entity.getStatus()));
        entry.setError(entity.getError());
        entry.setExternalId(entity.getExternalId());
        entry.setUsername(entity.getUsername());
        entry.setIp(entity.getIp());
        entry.setUserAgent(entity.getUserAgent());
        return entry;
    }

    public ExternalNotificationHistoryEntry toNotificationEntry(NotificationEntity entity) {
        ExternalNotificationHistoryEntry entry = new ExternalNotificationHistoryEntry();
        entry.setId(entity.getId());
        entry.setTime(entity.getTime());
        entry.setEventType(name(entity.getNotificationEventType()));
        entry.setMessageType(name(entity.getMessageType()));
        entry.setTitle(entity.getTitle());
        entry.setBody(entity.getBody());
        entry.setUrls(toUrls(entity.getUrls()));
        entry.setDisplayed(entity.isDisplayed());
        return entry;
    }

    /**
     * Turns the internal page into the contract's own envelope. Spring's {@code Page} never leaves this class.
     */
    public <E, T> ExternalPage<T> toPage(Page<E> page, int requestedPage, int limit, Function<E, T> entryMapper) {
        List<T> entries = new ArrayList<>(page.getContent().size());
        for (E entity : page.getContent()) {
            entries.add(entryMapper.apply(entity));
        }
        long totalElements = page.getTotalElements();
        int totalPages = limit <= 0 ? 0 : (int) ((totalElements + limit - 1) / limit);
        return new ExternalPage<>(requestedPage, limit, totalElements, totalPages, entries);
    }

    /**
     * The Apprise URLs are stored as one free text field. Apprise itself separates them with commas, and the config
     * field is multi line, so both are treated as separators.
     */
    List<String> toUrls(String urls) {
        if (!StringUtils.hasText(urls)) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (String candidate : urls.split("[,\\r\\n]+")) {
            String trimmed = candidate.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private List<ExternalIdentifier> toIdentifiers(Set<IdentifierKeyValuePair> identifiers) {
        if (identifiers == null) {
            return List.of();
        }
        return identifiers.stream()
                .map(pair -> new ExternalIdentifier(pair.getIdentifierKey(), pair.getIdentifierValue()))
                .sorted(Comparator.comparing(ExternalIdentifier::getKey, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private List<String> sorted(Set<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream().sorted(Comparator.nullsLast(Comparator.naturalOrder())).toList();
    }

    private String name(Enum<?> value) {
        return value == null ? null : value.name();
    }
}
