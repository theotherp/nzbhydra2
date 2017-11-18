package org.nzbhydra.genericstorage;


import org.springframework.data.jpa.repository.JpaRepository;

public interface GenericStorageDataRepository extends JpaRepository<GenericStorageData, Integer> {

    public GenericStorageData findByKey(String key);

    public void deleteByKey(String key);

}
