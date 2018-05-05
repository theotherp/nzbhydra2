package org.nzbhydra.genericstorage;

import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;

@Data
@Entity
@NoArgsConstructor
public class GenericStorageData {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;
    protected String key;
    @Lob
    protected String data;

    public GenericStorageData(String key, String data) {
        this.key = key;
        this.data = data;
    }
}
