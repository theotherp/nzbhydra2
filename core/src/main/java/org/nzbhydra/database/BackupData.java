package org.nzbhydra.database;

import lombok.Data;

import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "backupdata")
public class BackupData {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    protected int id;

    @Convert(converter = com.github.marschall.threeten.jpa.LocalDateTimeConverter.class)
    protected LocalDateTime lastBackup;

    public BackupData() {
        this.lastBackup = LocalDateTime.now();
    }


}
