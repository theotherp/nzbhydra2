-- Replaces the random 64 bit hash which was used as primary key of SEARCHRESULT with a sequential ID.
--
-- With the hash as primary key every insert landed on a random page of the primary key B-tree which was the main
-- driver of database file bloat. The hash stays the externally visible identifier (download links, API, UI, the
-- queues of Sonarr/Radarr etc. contain it) and moves to the new column HASH; the new sequential ID is only used
-- internally for foreign keys.
--
-- Search results are only a cache which is cleaned up after a couple of days (see OldResultsCleanupTask). To keep
-- this migration cheap on databases with millions of rows only the results which are referenced by a download
-- (INDEXERNZBDOWNLOAD) are copied. All other results and their occurrences (INDEXERSEARCHRESULTOCCURRENCE) are
-- deliberately dropped; they'd be deleted by the cleanup task anyway and are recreated by the next searches.
--
-- Only standard DDL is used so that this works on H2 2.1.x as well as 2.4.x.

-- The increment must match the allocationSize of the sequence generator in SearchResultEntity (pooled optimizer).
CREATE SEQUENCE SEARCHRESULT_SEQ
    INCREMENT BY 50
    START WITH 1;

CREATE TABLE SEARCHRESULT_NEW
(
    ID                  BIGINT                  NOT NULL PRIMARY KEY,
    HASH                BIGINT                  NOT NULL,
    DETAILS             CHARACTER VARYING(4000),
    DOWNLOAD_TYPE       CHARACTER VARYING(255),
    FIRST_FOUND         TIMESTAMP,
    INDEXERGUID         CHARACTER VARYING(4000) NOT NULL,
    LINK                CHARACTER VARYING,
    PUB_DATE            TIMESTAMP,
    TITLE               CHARACTER VARYING(4000) NOT NULL,
    INDEXER_ID          INTEGER                 NOT NULL,
    INDEXERSEARCHENTITY INTEGER
);

-- Copy only the results which are referenced by a download. The old primary key becomes the hash.
INSERT INTO SEARCHRESULT_NEW (ID, HASH, DETAILS, DOWNLOAD_TYPE, FIRST_FOUND, INDEXERGUID, LINK, PUB_DATE, TITLE, INDEXER_ID, INDEXERSEARCHENTITY)
SELECT NEXT VALUE FOR SEARCHRESULT_SEQ,
       ID,
       DETAILS,
       DOWNLOAD_TYPE,
       FIRST_FOUND,
       INDEXERGUID,
       LINK,
       PUB_DATE,
       TITLE,
       INDEXER_ID,
       INDEXERSEARCHENTITY
FROM SEARCHRESULT
WHERE ID IN (SELECT SEARCH_RESULT_ID FROM INDEXERNZBDOWNLOAD WHERE SEARCH_RESULT_ID IS NOT NULL);

-- Both indexes are needed for the remapping below to be fast.
CREATE UNIQUE INDEX SEARCHRESULT_HASH_INDEX
    ON SEARCHRESULT_NEW (HASH);

-- Drop the foreign keys which reference the old table before remapping the references.
ALTER TABLE INDEXERNZBDOWNLOAD DROP CONSTRAINT IF EXISTS FKR5G21PDW3HHS1SEFKHD3HBDGL;
ALTER TABLE INDEXERSEARCHRESULTOCCURRENCE DROP CONSTRAINT IF EXISTS ISRO_SEARCH_RESULT_FK;

-- Remap the references from the old hash ID to the new sequential ID.
UPDATE INDEXERNZBDOWNLOAD t
SET SEARCH_RESULT_ID = (SELECT n.ID FROM SEARCHRESULT_NEW n WHERE n.HASH = t.SEARCH_RESULT_ID)
WHERE t.SEARCH_RESULT_ID IS NOT NULL;

-- Occurrences of results which were not copied are dropped, the rest is remapped.
DELETE
FROM INDEXERSEARCHRESULTOCCURRENCE
WHERE SEARCH_RESULT_ID NOT IN (SELECT HASH FROM SEARCHRESULT_NEW);

UPDATE INDEXERSEARCHRESULTOCCURRENCE t
SET SEARCH_RESULT_ID = (SELECT n.ID FROM SEARCHRESULT_NEW n WHERE n.HASH = t.SEARCH_RESULT_ID);

DROP TABLE SEARCHRESULT;

ALTER TABLE SEARCHRESULT_NEW RENAME TO SEARCHRESULT;

-- Deliberately NOT unique, as in V1: an indexer may return the same GUID with a changed title or link, which is stored
-- as a separate result (different hash).
CREATE INDEX UKFTFA80663URIMM78EPNXHYOM_INDEX_C
    ON SEARCHRESULT (INDEXER_ID, INDEXERGUID);

-- The hourly cleanup (OldResultsCleanupTask) deletes by FIRST_FOUND which had no index before.
CREATE INDEX SEARCHRESULT_FIRST_FOUND_INDEX
    ON SEARCHRESULT (FIRST_FOUND);

ALTER TABLE SEARCHRESULT
    ADD CONSTRAINT FKR5G21PDW3HHS1SEFVJY30TGMI
        FOREIGN KEY (INDEXER_ID) REFERENCES INDEXER (ID) ON DELETE CASCADE;

ALTER TABLE INDEXERNZBDOWNLOAD
    ADD CONSTRAINT FKR5G21PDW3HHS1SEFKHD3HBDGL
        FOREIGN KEY (SEARCH_RESULT_ID) REFERENCES SEARCHRESULT (ID) ON DELETE CASCADE;

ALTER TABLE INDEXERSEARCHRESULTOCCURRENCE
    ADD CONSTRAINT ISRO_SEARCH_RESULT_FK
        FOREIGN KEY (SEARCH_RESULT_ID) REFERENCES SEARCHRESULT (ID) ON DELETE CASCADE;
