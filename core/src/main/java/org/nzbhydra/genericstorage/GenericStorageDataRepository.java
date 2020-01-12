package org.nzbhydra.genericstorage;


import org.springframework.data.jpa.repository.JpaRepository;

public interface GenericStorageDataRepository extends JpaRepository<GenericStorageData, Integer> {

    GenericStorageData findByKey(String key);

    void deleteByKey(String key);

}
