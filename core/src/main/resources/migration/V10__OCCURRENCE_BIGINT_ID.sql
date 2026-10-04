-- INDEXERSEARCHRESULTOCCURRENCE gets one row per result per indexer search, so its sequence is used up much faster
-- than any other. With a 32 bit ID it would eventually overflow and every search with history enabled would fail.
-- The sequence itself is already BIGINT.
--
-- Only standard DDL is used so that this works on H2 2.1.x as well as 2.4.x. Primary key and foreign keys are kept.
ALTER TABLE INDEXERSEARCHRESULTOCCURRENCE ALTER COLUMN ID SET DATA TYPE BIGINT;
