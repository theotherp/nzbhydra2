create sequence HIBERNATE_SEQUENCE
    start with 50;


create table GENERIC_STORAGE_DATA
(
    ID   INTEGER not null
        primary key,
    DATA CHARACTER LARGE OBJECT,
    KEY  CHARACTER VARYING(255)
);

create table IDENTIFIER_KEY_VALUE_PAIR
(
    ID               INTEGER not null
        primary key,
    IDENTIFIER_KEY   CHARACTER VARYING(255),
    IDENTIFIER_VALUE CHARACTER VARYING(255)
);

create table INDEXER
(
    ID        INTEGER not null
        primary key,
    NAME      CHARACTER VARYING(255),
    STATUS_ID INTEGER
);

create unique index UK_XIFS7FHUVN4UB7IGF11FQEP0_INDEX_9
    on INDEXER (NAME);

create table INDEXERAPIACCESS
(
    ID            INTEGER not null
        primary key,
    ACCESS_TYPE   CHARACTER VARYING(255),
    ERROR         CHARACTER VARYING(4000),
    RESPONSE_TIME BIGINT,
    RESULT        CHARACTER VARYING(255),
    TIME          TIMESTAMP,
    INDEXER_ID    INTEGER,
    constraint FKFLRMBYQ8CLDV48SWRYIY0YJD2
        foreign key (INDEXER_ID) references INDEXER
            on delete cascade
);

create index INDEXERAPIACCESS_TIME_INDEX
    on INDEXERAPIACCESS (TIME desc);

create index INDEXERAPIACC_INDID_TIME_INDEX
    on INDEXERAPIACCESS (INDEXER_ID, TIME);

create index INDEXERAPIACC_TIME_INDEX
    on INDEXERAPIACCESS (TIME);

create table INDEXERAPIACCESS_SHORT
(
    ID              INTEGER not null
        primary key,
    INDEXER_ID      INTEGER,
    TIME            TIMESTAMP,
    SUCCESSFUL      BOOLEAN,
    API_ACCESS_TYPE CHARACTER VARYING(255),
    constraint FKFLRMBYQ8CLDV48KDUNDZHD
        foreign key (INDEXER_ID) references INDEXER
);

create index INDEXERAPIACCESS_SHORT_ACCESSTYPE_INDEXER_ID_TIME_INDEX
    on INDEXERAPIACCESS_SHORT (INDEXER_ID asc, API_ACCESS_TYPE asc, TIME desc);

create table INDEXERLIMIT
(
    ID              INTEGER not null
        primary key,
    INDEXER_ID      INTEGER,
    API_HITS        INTEGER,
    API_HIT_LIMIT   INTEGER,
    DOWNLOADS       INTEGER,
    DOWNLOAD_LIMIT  INTEGER,
    OLDEST_API_HIT  TIMESTAMP,
    OLDEST_DOWNLOAD TIMESTAMP,
    constraint DABCDLRMBYQ8CLDV48SWRYIY0YKD2
        foreign key (INDEXER_ID) references INDEXER
);

create table INDEXERUNIQUENESSSCORE
(
    ID         INTEGER not null
        primary key,
    INDEXER_ID INTEGER not null,
    INVOLVED   INTEGER not null,
    HAVE       INTEGER not null,
    HASRESULT  BOOLEAN not null,
    constraint MFKFLRMBYQ8CLDV48SWRYIY0YKD2
        foreign key (INDEXER_ID) references INDEXER
);

create table MOVIEINFO
(
    ID         INTEGER not null
        primary key,
    IMDB_ID    CHARACTER VARYING(255),
    POSTER_URL CHARACTER VARYING(255),
    TITLE      CHARACTER VARYING(255),
    TMDB_ID    CHARACTER VARYING(255),
    YEAR       INTEGER,
    constraint MOVIEINFO_TMDB_ID_IMDB_ID_PK
        unique (TMDB_ID, IMDB_ID)
);

create table NOTIFICATION
(
    ID                      INTEGER                not null
        primary key,
    NOTIFICATION_EVENT_TYPE CHARACTER VARYING(255) not null,
    MESSAGE_TYPE            CHARACTER VARYING(255) not null,
    TITLE                   CHARACTER VARYING(255),
    BODY                    CHARACTER VARYING(255) not null,
    URLS                    CHARACTER VARYING(255),
    TIME                    TIMESTAMP              not null,
    DISPLAYED               BOOLEAN default FALSE  not null
);

create table PERSISTENT_LOGINS
(
    SERIES    CHARACTER VARYING(255) not null
        primary key,
    LAST_USED TIMESTAMP              not null,
    TOKEN     CHARACTER VARYING(255) not null,
    USERNAME  CHARACTER VARYING(255) not null
);

create table SEARCH
(
    ID            INTEGER not null
        primary key,
    AUTHOR        CHARACTER VARYING(255),
    CATEGORY_NAME CHARACTER VARYING(255),
    EPISODE       CHARACTER VARYING(255),
    QUERY         CHARACTER VARYING(1000),
    SEARCH_TYPE   CHARACTER VARYING(255),
    SEASON        INTEGER,
    SOURCE        CHARACTER VARYING(255),
    TIME          TIMESTAMP,
    TITLE         CHARACTER VARYING(255),
    USER_AGENT    CHARACTER VARYING(255),
    USERNAME      CHARACTER VARYING(255),
    IP            CHARACTER VARYING(255)
);

create table INDEXERSEARCH
(
    ID                INTEGER not null
        primary key,
    RESULTS_COUNT     INTEGER,
    SUCCESSFUL        BOOLEAN,
    INDEXER_ENTITY_ID INTEGER,
    SEARCH_ENTITY_ID  INTEGER,
    constraint FK48A7TLYKV21V8CEGF6SUCDYGX
        foreign key (SEARCH_ENTITY_ID) references SEARCH
            on delete cascade,
    constraint FKOBOGIXH7OUOCYK1M0417GYQKR
        foreign key (INDEXER_ENTITY_ID) references INDEXER
            on delete cascade
);

create index INDEXERSEARCH_INDEXER_ENTITY_ID_SEARCH_ENTITY_ID_INDEX
    on INDEXERSEARCH (INDEXER_ENTITY_ID, SEARCH_ENTITY_ID);

create index SEARCH_TIME_INDEX
    on SEARCH (TIME desc);

create index SEARCH_USER_HISTORY_INDEX1
    on SEARCH (USERNAME asc, SOURCE asc, TIME desc);

create index SEARCH_USER_HISTORY_INDEX2
    on SEARCH (SOURCE asc, TIME desc);

create table SEARCHRESULT
(
    ID                  BIGINT                  not null
        primary key,
    DETAILS             CHARACTER VARYING(4000),
    DOWNLOAD_TYPE       CHARACTER VARYING(255),
    FIRST_FOUND         TIMESTAMP,
    INDEXERGUID         CHARACTER VARYING(4000) not null,
    LINK                CHARACTER VARYING,
    PUB_DATE            TIMESTAMP,
    TITLE               CHARACTER VARYING(4000) not null,
    INDEXER_ID          INTEGER                 not null,
    INDEXERSEARCHENTITY INTEGER,
    constraint FKR5G21PDW3HHS1SEFVJY30TGMI
        foreign key (INDEXER_ID) references INDEXER
            on delete cascade
);

create table INDEXERNZBDOWNLOAD
(
    ID               INTEGER not null
        primary key,
    ACCESS_SOURCE    CHARACTER VARYING(255),
    AGE              INTEGER,
    ERROR            CHARACTER VARYING(4000),
    EXTERNAL_ID      CHARACTER VARYING(255),
    NZB_ACCESS_TYPE  CHARACTER VARYING(255),
    STATUS           CHARACTER VARYING(255),
    TIME             TIMESTAMP,
    USERNAME         CHARACTER VARYING(255),
    USER_AGENT       CHARACTER VARYING(4000),
    IP               CHARACTER VARYING(255),
    SEARCH_RESULT_ID BIGINT,
    constraint FKR5G21PDW3HHS1SEFKHD3HBDGL
        foreign key (SEARCH_RESULT_ID) references SEARCHRESULT
            on delete cascade
);

create index INDEXERNZBDOWNLOAD_SEARCHRESULTID_INDEX
    on INDEXERNZBDOWNLOAD (SEARCH_RESULT_ID);

create index INDEXERNZBDOWNLOAD_STATUS_INDEX
    on INDEXERNZBDOWNLOAD (STATUS asc, TIME desc);

create index INDEXERNZBDOWNLOAD_TIME_INDEX
    on INDEXERNZBDOWNLOAD (TIME desc);

create index NZB_DOWNLOAD_EXT_ID
    on INDEXERNZBDOWNLOAD (EXTERNAL_ID);

create index UKFTFA80663URIMM78EPNXHYOM_INDEX_C
    on SEARCHRESULT (INDEXER_ID, INDEXERGUID);

create table SEARCH_IDENTIFIERS
(
    SEARCH_ENTITY_ID INTEGER not null,
    IDENTIFIERS_ID   INTEGER not null,
    primary key (SEARCH_ENTITY_ID, IDENTIFIERS_ID),
    constraint FK8V41HNWG7RV1GELG37QK9M7WK
        foreign key (IDENTIFIERS_ID) references IDENTIFIER_KEY_VALUE_PAIR,
    constraint FKG7116YD6U2Q5LPQQLCLDKBVGL
        foreign key (SEARCH_ENTITY_ID) references SEARCH
);

create table SHOWNNEWS
(
    ID      INTEGER not null
        primary key,
    VERSION CHARACTER VARYING(255)
);

create table TVINFO
(
    ID         INTEGER not null
        primary key,
    POSTER_URL CHARACTER VARYING(255),
    TITLE      CHARACTER VARYING(255),
    TVDB_ID    CHARACTER VARYING(255),
    TVMAZE_ID  CHARACTER VARYING(255),
    TVRAGE_ID  CHARACTER VARYING(255),
    YEAR       INTEGER,
    IMDB_ID    CHARACTER VARYING(255)
);

create unique index UK_GFWLXF98S7J77CF7G6FSFVSS0_INDEX_9
    on TVINFO (TVRAGE_ID);

create unique index UK_NJKRL57AGU954UJKOTT65HWHH_INDEX_9
    on TVINFO (TVMAZE_ID);

create unique index UK_PGYJIFSNJSVJ1W9P0XVIDGP5E_INDEX_9
    on TVINFO (TVDB_ID);

