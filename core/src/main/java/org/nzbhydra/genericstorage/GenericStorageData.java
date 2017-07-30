package org.nzbhydra.genericstorage;

import lombok.Data;

import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;

@Data
@Entity
public class GenericStorageData {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;
    protected String key;
    protected String data;

    public GenericStorageData(String key, String data) {
        this.key = key;
        this.data = data;
    }


}
