package org.nzbhydra.news;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "shownnews")
public class ShownNews {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    private String version;

    public ShownNews(String version) {
        this.version = version;
    }

    public ShownNews() {
    }
}
