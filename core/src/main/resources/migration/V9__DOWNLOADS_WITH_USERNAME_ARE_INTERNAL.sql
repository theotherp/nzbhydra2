-- "API" is reserved for downloads of results that came from an API call. Downloads a logged-in user sent to the
-- downloader were fetched by the download client through the API link and were recorded as API although the link
-- carried the user's name; from now on they are recorded as internal (FileDownloadEntity), and the existing rows follow.
UPDATE INDEXERNZBDOWNLOAD SET ACCESS_SOURCE = 'INTERNAL' WHERE ACCESS_SOURCE = 'API' AND USERNAME IS NOT NULL;
