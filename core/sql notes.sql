--indexer api accesses per day of week
SELECT
  indexer_id,
  DAYOFWEEK(time) AS dayOfWeek,
  count(*)        AS accessesPerDay
FROM INDEXERAPIACCESS
GROUP BY DAYOFWEEK(time), INDEXER_ID;

--indexer downloads per day of week
SELECT
  indexer_id,
  DAYOFWEEK(time) AS dayOfWeek,
  count(*)        AS downloads
FROM INDEXERNZBDOWNLOAD
  LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID
GROUP BY DAYOFWEEK(time), INDEXER_ID;

--searches per day of week
SELECT
  DAYOFWEEK(time) AS dayOfWeek,
  count(*)        AS searches
FROM SEARCH
GROUP BY DAYOFWEEK(time);

--

--indexer api accesses per hour of day
SELECT
  indexer_id,
  HOUR(time) AS hourOfDay,
  count(*)   AS accessesPerDay
FROM INDEXERAPIACCESS
GROUP BY HOUR(time), INDEXER_ID;

--downloads per hour of day
SELECT
  indexer_id,
  HOUR(time) AS hourOfDay,
  count(*)   AS downloads
FROM INDEXERNZBDOWNLOAD
  LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID
GROUP BY HOUR(time), INDEXER_ID;

--

-- inexer api accesses per day on average
SELECT (sum(accesses) / count(INDEXER_ID)) AS accessesPerDay
FROM (
  SELECT
    count(*) AS accesses,
    indexer_id,
    DAYOFYEAR(time),
    year(time)
  FROM INDEXERAPIACCESS
  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)
)
WHERE INDEXER_ID = 1;

-- downloads per day on average
SELECT (sum(downloads) / count(INDEXER_ID)) AS downloadsPerDay
FROM (
  SELECT
    count(*) AS downloads,
    indexer_id,
    DAYOFYEAR(time),
    year(time)
  FROM INDEXERNZBDOWNLOAD
    LEFT JOIN INDEXERAPIACCESS ON INDEXERNZBDOWNLOAD.INDEXER_API_ACCESS_ID = INDEXERAPIACCESS.ID
  GROUP BY INDEXER_ID, year(time), DAYOFYEAR(time)
)
WHERE INDEXER_ID = 2;
