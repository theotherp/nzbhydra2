package org.nzbhydra.genericstorage;


import org.springframework.data.jpa.repository.JpaRepository;

public interface GenericStorageDataRepository extends JpaRepository<GenericStorageData, Integer> {

    public GenericStorageData findFirstByKey(String key);

}
