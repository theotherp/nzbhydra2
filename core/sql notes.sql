--overall indexer api accesses per day of week
SELECT
  indexer_id,
  DAYOFWEEK(time) AS dayOfWeek,
  counter(*)      AS accessesPerDay
FROM INDEXERAPIACCESS
WHERE INDEXER_ID IN (:indexerIds)
GROUP BY DAYOFWEEK(time), INDEXER_ID;

--overall indexer downloads per day of week
SELECT
  indexer_id,
  DAYOFWEEK(time) AS dayOfWeek,
  counter(*)      AS downloads
FROM INDEXERNZBDOWNLOAD
  LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID
WHERE INDEXER_ID IN (:indexerIds)
GROUP BY DAYOFWEEK(time), INDEXER_ID;

--overall searches per day of week
SELECT
  DAYOFWEEK(time) AS dayOfWeek,
  count(*)        AS counter
FROM SEARCH
GROUP BY DAYOFWEEK(time);

--

--overall indexer api accesses per hour of day
SELECT
  indexer_id,
  HOUR(time) AS hourOfDay,
  counter(*) AS accessesPerDay
FROM INDEXERAPIACCESS
WHERE INDEXER_ID IN (:indexerIds)
GROUP BY HOUR(time), INDEXER_ID;

--overall downloads per hour of day
SELECT
  indexer_id,
  HOUR(time) AS hourOfDay,
  counter(*) AS downloads
FROM INDEXERNZBDOWNLOAD
  LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID
WHERE INDEXER_ID IN (:indexerIds)
GROUP BY HOUR(time), INDEXER_ID;

--

--overall indexer api accesses per day on average
SELECT (sum(accesses) / counter(INDEXER_ID)) AS accessesPerDay
FROM (
  SELECT
    counter(*) AS accesses,
    indexer_id,
    DAYOFYEAR(time),
    year(time)
  FROM INDEXERAPIACCESS
  WHERE INDEXER_ID IN (:indexerIds)
  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)
)
WHERE INDEXER_ID IN (:indexerIds);

--overall downloads per day on average
SELECT (sum(downloads) / counter(INDEXER_ID)) AS downloadsPerDay
FROM (
  SELECT
    counter(*) AS downloads,
    indexer_id,
    DAYOFYEAR(time),
    year(time)
  FROM INDEXERNZBDOWNLOAD
    LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID
  WHERE INDEXER_ID IN (:indexerIds)
  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)
)
WHERE INDEXER_ID IN (:indexerIds);

--average response times and deltas by indexer
SELECT
  i.NAME,
  avgIndexerResponseTime,
  responseTimeDelta
FROM (
  SELECT
    INDEXER_ID,
    avg(RESPONSE_TIME)                                AS avgIndexerResponseTime,
    (avg(RESPONSE_TIME - overallAverageResponseTime)) AS responseTimeDelta
  FROM INDEXERAPIACCESS, (SELECT avg(RESPONSE_TIME) AS overallAverageResponseTime
                          FROM INDEXERAPIACCESS
                          WHERE INDEXER_ID IN (:indexerIds) AND RESPONSE_TIME IS NOT NULL) x
  WHERE response_time IS NOT NULL
  GROUP BY INDEXER_ID, overallAverageResponseTime) LEFT JOIN indexer i ON INDEXER_ID = ID
WHERE INDEXER_ID IN (:indexerIds)
ORDER BY avgIndexerResponseTime ASC NULLS LAST;

--per-indexer api accesses per day on average
SELECT
  x.INDEXER_ID,
  (sum(x.accesses) / counter(x.INDEXER_ID)) AS accessesPerDay
FROM (
       SELECT
         counter(*) AS accesses,
         indexer_id,
         DAYOFYEAR(time),
         year(time)
       FROM INDEXERAPIACCESS
       WHERE INDEXER_ID IN (:indexerIds)
       GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)
     ) x
WHERE x.INDEXER_ID IN (:indexerIds)
GROUP BY x.INDEXER_ID
ORDER BY INDEXER_ID;

--per-indexer percentage of accesses successful
SELECT
  x.INDEXER_ID
  --,(100/(CAST(z.countAll AS FLOAT)/x.countFailed)) as percentFailed
  ,
  (100 / counter(z.INDEXER_ID) / x.countFailed) AS percentFailed,
  counter(z.INDEXER_ID)
FROM
  (
    SELECT
      INDEXER_ID,
      counter(*) AS countFailed
    FROM INDEXERAPIACCESS
    WHERE INDEXER_ID IN (:indexerIds) AND RESULT = 'CONNECTION_ERROR'
    GROUP BY INDEXER_ID
  ) x,
  (SELECT
     INDEXER_ID,
     counter(*) AS countAll
   FROM INDEXERAPIACCESS
   WHERE INDEXER_ID IN (:indexerIds)
   GROUP BY INDEXER_ID) z

WHERE x.INDEXER_ID IN (:indexerIds)
GROUP BY x.INDEXER_ID, countFailed;

--100/(6/2)  = 2 von 6

SELECT
  INDEXER.ID,
  x.countFailed
FROM INDEXER
  LEFT JOIN
  (SELECT
     INDEXER_ID,
     counter(*) AS countFailed
   FROM INDEXERAPIACCESS
   WHERE INDEXER_ID IN (:indexerIds) AND RESULT = 'CONNECTION_ERROR'
   GROUP BY INDEXER_ID) x ON x.INDEXER_ID = INDEXER.ID


--indexer sum and all results sum for all searches where indexer was involved with identifierkey based searches
SELECT
  INDEXERRESULTSSUM,
  ALLRESULTSSUM,
  INDEXERUNIQUERESULTSSUM,
  ALLUNIQUERESULTSSUM
FROM
  (SELECT
     SUM(INDEXERSEARCH.RESULTS_COUNT)  AS INDEXERRESULTSSUM,
     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS INDEXERUNIQUERESULTSSUM
   FROM indexersearch
   WHERE indexersearch.ID IN (SELECT INDEXERSEARCH.ID
                              FROM indexersearch
                  LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID
                WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId
                      AND INDEXERSEARCH.successful AND
                      INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID
                                                         FROM SEARCH
                                                           LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID
                                                         WHERE
                                                           (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL)
                                                           AND (SEARCH.time > TIMESTAMP(:AFTER) AND SEARCH.time < TIMESTAMP(:BEFORE))
                      )
   )) FORINDEXER,
  (SELECT
     sum(INDEXERSEARCH.RESULTS_COUNT)  AS ALLRESULTSSUM,
     SUM(INDEXERSEARCH.UNIQUE_RESULTS) AS ALLUNIQUERESULTSSUM
   FROM INDEXERSEARCH
   WHERE INDEXERSEARCH.ID IN
         (SELECT INDEXERSEARCH.ID
          FROM INDEXERSEARCH
          WHERE INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID
                                                   FROM indexersearch
                         LEFT JOIN SEARCH ON INDEXERSEARCH.SEARCH_ENTITY_ID = SEARCH.ID
                         LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID
                       WHERE indexersearch.INDEXER_ENTITY_ID = :indexerId
                             AND INDEXERSEARCH.successful AND
                             INDEXERSEARCH.SEARCH_ENTITY_ID IN (SELECT SEARCH.ID
                                                                FROM SEARCH
                                                                  LEFT JOIN SEARCH_IDENTIFIERS ON SEARCH.ID = SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID
                                                                WHERE
                                                                  (SEARCH.episode IS NOT NULL OR SEARCH.season IS NOT NULL OR SEARCH.query IS NOT NULL OR
                                                                   SEARCH_IDENTIFIERS.SEARCH_ENTITY_ID IS NOT NULL)
                                                                  AND (SEARCH.time > TIMESTAMP(:AFTER) AND SEARCH.time < TIMESTAMP(:BEFORE))
                             )) AND INDEXERSEARCH.successful
         )) FORALL;


DELETE FROM IDENTIFIER_KEY_VALUE_PAIR;
DELETE FROM SEARCH_IDENTIFIERS;


DELETE FROM INDEXERSEARCH;
DELETE FROM SEARCH;
DELETE FROM INDEXERAPIACCESS;
DELETE FROM SEARCHRESULT;
DELETE FROM indexer;
DELETE FROM INDEXERSTATUS;

INSERT INTO INDEXERSTATUS (ID) VALUES (1);
INSERT INTO INDEXERSTATUS (ID) VALUES (2);
INSERT INTO INDEXER VALUES (1, 'indexe1', 1);
INSERT INTO INDEXER VALUES (2, 'indexe2', 2);

--Regular query search, all successful indexer searches should be included
INSERT INTO SEARCH (ID, TIME, QUERY) VALUES (1, CURRENT_TIMESTAMP, 'somequery');
--Search 1 for indexer 1
INSERT INTO INDEXERSEARCH (ID, SUCCESSFUL, RESULTS_COUNT, PROCESSED_RESULTS, UNIQUE_RESULTS, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (1, TRUE, 900, 100, 7, 1, 1);
--Search 2 for indexer 1, ignored because unsuccessful
INSERT INTO INDEXERSEARCH (ID, SUCCESSFUL, RESULTS_COUNT, PROCESSED_RESULTS, UNIQUE_RESULTS, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (2, FALSE, 99, 99, 99, 1, 1);
--Search 1 for indexer 2
INSERT INTO INDEXERSEARCH (ID, SUCCESSFUL, RESULTS_COUNT, PROCESSED_RESULTS, UNIQUE_RESULTS, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (3, TRUE, 300, 100, 3, 2, 1);

--Update search, no indexer searches should be included
INSERT INTO SEARCH (ID, TIME, QUERY) VALUES (2, CURRENT_TIMESTAMP, NULL);
--Search 1 for indexer 1
INSERT INTO INDEXERSEARCH (ID, SUCCESSFUL, RESULTS_COUNT, PROCESSED_RESULTS, UNIQUE_RESULTS, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (4, TRUE, 789, 654, 7, 1, 2);
--Search 2 for indexer 1, ignored because unsuccessful
INSERT INTO INDEXERSEARCH (ID, SUCCESSFUL, RESULTS_COUNT, PROCESSED_RESULTS, UNIQUE_RESULTS, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (5, FALSE, 77, 77, 77, 1, 2);
--Search 1 for indexer 2
INSERT INTO INDEXERSEARCH (ID, SUCCESSFUL, RESULTS_COUNT, PROCESSED_RESULTS, UNIQUE_RESULTS, INDEXER_ENTITY_ID, SEARCH_ENTITY_ID) VALUES (6, TRUE, 123, 456, 3, 2, 2);
