--Add downloads of the last day to the short time storage of indexer API accesses

--Update existing entries
update INDEXERAPIACCESS_SHORT
set API_ACCESS_TYPE = 'SEARCH';

--Add downloads from last day
insert into INDEXERAPIACCESS_SHORT (ID, INDEXER_ID, TIME, SUCCESSFUL, API_ACCESS_TYPE)
SELECT HIBERNATE_SEQUENCE.Nextval, x.INDEXER_ID, x.TIME, true, 'NZB'
FROM (select D.TIME, R.INDEXER_ID from INDEXERNZBDOWNLOAD D
                                         left join SEARCHRESULT R on D.SEARCH_RESULT_ID = R.ID where d.TIME > DATEADD('DAY', -2, CURRENT_TIMESTAMP())) x;