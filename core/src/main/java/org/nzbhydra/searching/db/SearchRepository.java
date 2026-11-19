

package org.nzbhydra.searching.db;


import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SearchRepository extends JpaRepository<SearchEntity, Integer> {

    //The order by repeats the columns fixed by the where clause so that H2 reads the rows in index order
    //(SEARCH_USER_HISTORY_INDEX1/2) and stops after the requested page. With only "order by t.time desc" it reads
    //and sorts every internal search first. Returning a list instead of a page also avoids a count query.
    @Query("select t from SearchEntity t where t.username = :username and t.source = 'INTERNAL' order by t.username, t.source, t.time desc")
    List<SearchEntity> findForUserSearchHistory(@Param("username") String username, Pageable pageable);

    @Query("select t from SearchEntity t where t.source = 'INTERNAL' order by t.source, t.time desc")
    List<SearchEntity> findForUserSearchHistory(Pageable pageable);

    List<SearchEntity> findAllByTitle(String title);
}
