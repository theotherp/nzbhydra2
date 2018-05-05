--Removing duplicates is hard, so we'll just delete the existing ones
DELETE FROM MOVIEINFO;
ALTER TABLE MOVIEINFO
  ADD CONSTRAINT MOVIEINFO_TMDB_ID_IMDB_ID_pk UNIQUE (TMDB_ID, IMDB_ID);