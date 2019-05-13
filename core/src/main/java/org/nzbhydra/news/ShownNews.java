package org.nzbhydra.news;

import lombok.Data;

import javax.persistence.*;

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
