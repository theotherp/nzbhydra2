package org.nzbhydra.downloading;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.web.SessionStorage;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Data
@Entity
@Table(name = "indexernzbdownload", indexes = {@Index(name = "NZB_DOWNLOAD_EXT_ID", columnList = "EXTERNAL_ID")})
public class FileDownloadEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @SequenceGenerator(allocationSize = 1, name = "INDEXERNZBDOWNLOAD_SEQ")
    protected int id;
    @ManyToOne
    @JsonIgnoreProperties(value = {"handler", "hibernateLazyInitializer"})
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SearchResultEntity searchResult;
    @Enumerated(EnumType.STRING)
    private FileDownloadAccessType nzbAccessType;
    @Enumerated(EnumType.STRING)
    private SearchSource accessSource;
    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant time = Instant.now();
    @Enumerated(EnumType.STRING)
    private FileDownloadStatus status;
    private String error;
    private String username;
    private String ip;
    private String userAgent;
    /**
     * The age of the NZB at the time of downloading.
     */
    private Integer age;
    @Column(name = "EXTERNAL_ID")
    private String externalId;

    public FileDownloadEntity(SearchResultEntity searchResult, FileDownloadAccessType nzbAccessType, SearchSource accessSource, FileDownloadStatus status, String error) {
        this.searchResult = searchResult;
        this.nzbAccessType = nzbAccessType;
        this.accessSource = accessSource;
        this.status = status;
        this.time = Instant.now();
        this.username = SessionStorage.username.get();
        this.userAgent = SessionStorage.userAgent.get();
        this.ip = SessionStorage.IP.get();
        this.age = (int) (Duration.between(searchResult.getPubDate(), searchResult.getFirstFound()).get(ChronoUnit.SECONDS) / (24 * 60 * 60));
        setError(error);
    }

    public void setError(String error) {
        if (error != null && error.length() > 4000) {
            this.error = error.substring(0,4000);
        } else {
            this.error = error;
        }
    }

    public FileDownloadEntity() {
        this.time = Instant.now();
    }
}
