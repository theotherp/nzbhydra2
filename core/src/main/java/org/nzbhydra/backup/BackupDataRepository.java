package org.nzbhydra.backup;


import org.springframework.data.jpa.repository.JpaRepository;

public interface BackupDataRepository extends JpaRepository<BackupData, Integer> {

}
