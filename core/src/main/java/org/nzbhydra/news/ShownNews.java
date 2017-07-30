package org.nzbhydra.news;

import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;

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
