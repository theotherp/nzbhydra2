package org.nzbhydra.indexers;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.IndexerConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
public class IndexerStatusesWeb {

    @Autowired
    private ConfigProvider configProvider;

    @Secured({"ROLE_USER"})
    @RequestMapping(value = "/internalapi/indexerstatuses")
    public List<IndexerStatus> indexerStatuses() {
        return getSortedStatuses();
    }

    protected List<IndexerStatus> getSortedStatuses() {
        return configProvider.getBaseConfig().getIndexers().stream()
                .sorted(
                        Comparator.comparing(IndexerConfig::getState)
                                .thenComparing(o -> o.getName().toLowerCase())
                )
                .map(
                        x -> new IndexerStatus(
                                x.getName(),
                                x.getState().name(),
                                x.getDisabledLevel(),
                                (x.getDisabledUntil() == null ? null : Instant.ofEpochMilli(x.getDisabledUntil())),
                                x.getLastError()
                        )
                )
                .collect(Collectors.toList());
    }

    @Data
    @AllArgsConstructor
    public static class IndexerStatus {
        private String indexer;
        private String state;
        private int level;
        private Instant disabledUntil;
        private String lastError;

    }

}
