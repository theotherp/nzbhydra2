package org.nzbhydra.searching;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SearchRepository extends JpaRepository<SearchEntity, Integer> {

    @Query("select t from SearchEntity t where t.username = :username and t.source = 'INTERNAL' order by t.time desc")
    Page<SearchEntity> findForUserSearchHistory(@Param("username") String username, Pageable pageable);

    @Query("select t from SearchEntity t where t.source = 'INTERNAL' order by t.time desc")
    Page<SearchEntity> findForUserSearchHistory(Pageable pageable);

}
