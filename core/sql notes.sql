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
