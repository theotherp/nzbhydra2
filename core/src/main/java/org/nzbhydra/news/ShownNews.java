package org.nzbhydra.news;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
@Entity
@Table(name = "shownnews")
public final class ShownNews {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    protected int id;

    private String version;

    public ShownNews(String version) {
        this.version = version;
    }

    public ShownNews() {
    }
}
