--Make sure no info entries with IMDB IDs without leading tt exist
DELETE
FROM NZBHYDRA.PUBLIC.TVINFO;
DELETE
FROM NZBHYDRA.PUBLIC.MOVIEINFO;