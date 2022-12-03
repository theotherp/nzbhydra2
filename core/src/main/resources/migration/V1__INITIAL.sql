create sequence HIBERNATE_SEQUENCE;

create sequence IDENTIFIER_KEY_VALUE_PAIR_SEQ
    increment by 50;

create sequence INDEXERAPIACCESS_SEQ
    increment by 50;

create sequence INDEXERAPIACCESS_SHORT_SEQ
    increment by 50;

create sequence INDEXERLIMIT_SEQ
    increment by 50;

create sequence INDEXERNZBDOWNLOAD_SEQ
    increment by 50;

create sequence INDEXERSEARCH_SEQ
    increment by 50;

create sequence INDEXERUNIQUENESSSCORE_SEQ
    increment by 50;

create sequence INDEXER_SEQ
    increment by 50;

create sequence MOVIEINFO_SEQ
    increment by 50;

create sequence NOTIFICATION_SEQ
    increment by 50;

create sequence SEARCH_SEQ
    increment by 50;

create sequence SHOWNNEWS_SEQ
    increment by 50;

create sequence TVINFO_SEQ
    increment by 50;

create table IDENTIFIER_KEY_VALUE_PAIR
(
    ID               INTEGER not null
        primary key,
    IDENTIFIER_KEY   CHARACTER VARYING(255),
    IDENTIFIER_VALUE CHARACTER VARYING(255)
);

create table INDEXER
(
    ID   INTEGER not null
        primary key,
    NAME CHARACTER VARYING(255)
        constraint UK_XIFS7FHUVN4UB7IGF11FQEP0
            unique
);

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

create table INDEXERAPIACCESS_SHORT
(
    ID              INTEGER not null
        primary key,
    API_ACCESS_TYPE CHARACTER VARYING(255),
    INDEXER_ID      INTEGER,
    SUCCESSFUL      BOOLEAN not null,
    TIME            TIMESTAMP
);

create table INDEXERLIMIT
(
    ID              INTEGER not null
        primary key,
    API_HIT_LIMIT   INTEGER,
    API_HITS        INTEGER,
    DOWNLOAD_LIMIT  INTEGER,
    DOWNLOADS       INTEGER,
    OLDEST_API_HIT  TIMESTAMP WITH TIME ZONE,
    OLDEST_DOWNLOAD TIMESTAMP WITH TIME ZONE,
    INDEXER_ID      INTEGER,
    constraint FKC85SH5GW2X9Q6KXJMIQWQ1H35
        foreign key (INDEXER_ID) references INDEXER
);

create table INDEXERUNIQUENESSSCORE
(
    ID         INTEGER not null
        primary key,
    HASRESULT  BOOLEAN,
    HAVE       INTEGER,
    INVOLVED   INTEGER,
    INDEXER_ID INTEGER,
    constraint FK55OQOYY2VQHCYDW6LPJ2AAO7K
        foreign key (INDEXER_ID) references INDEXER
            on delete cascade
);

create table MOVIEINFO
(
    ID         INTEGER not null
        primary key,
    IMDB_ID    CHARACTER VARYING(255),
    POSTER_URL CHARACTER VARYING(255),
    TITLE      CHARACTER VARYING(255),
    TMDB_ID    CHARACTER VARYING(255),
    YEAR       INTEGER
);

create table NOTIFICATION
(
    ID                      INTEGER not null
        primary key,
    BODY                    CHARACTER VARYING(255),
    DISPLAYED               BOOLEAN not null,
    MESSAGE_TYPE            CHARACTER VARYING(255),
    NOTIFICATION_EVENT_TYPE CHARACTER VARYING(255),
    TIME                    TIMESTAMP,
    TITLE                   CHARACTER VARYING(255),
    URLS                    CHARACTER VARYING(255)
);

create table PERSISTENT_LOGINS
(
    SERIES    CHARACTER VARYING(255) not null
        primary key,
    LAST_USED TIMESTAMP,
    TOKEN     CHARACTER VARYING(255),
    USERNAME  CHARACTER VARYING(255)
);

create table SEARCH
(
    ID            INTEGER not null
        primary key,
    AUTHOR        CHARACTER VARYING(255),
    CATEGORY_NAME CHARACTER VARYING(255),
    EPISODE       CHARACTER VARYING(255),
    IP            CHARACTER VARYING(255),
    QUERY         CHARACTER VARYING(255),
    SEARCH_TYPE   CHARACTER VARYING(255),
    SEASON        INTEGER,
    SOURCE        CHARACTER VARYING(255),
    TIME          TIMESTAMP,
    TITLE         CHARACTER VARYING(255),
    USER_AGENT    CHARACTER VARYING(255),
    USERNAME      CHARACTER VARYING(255)
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
        foreign key (INDEXER_ENTITY_ID) references INDEXER
            on delete cascade,
    constraint FKOBOGIXH7OUOCYK1M0417GYQKR
        foreign key (SEARCH_ENTITY_ID) references SEARCH
            on delete cascade
);

create index ISINDEX1
    on INDEXERSEARCH (INDEXER_ENTITY_ID);

create index ISINDEX2
    on INDEXERSEARCH (SEARCH_ENTITY_ID);

create table SEARCHRESULT
(
    ID                  BIGINT not null
        primary key,
    DETAILS             CHARACTER VARYING(4000),
    DOWNLOAD_TYPE       CHARACTER VARYING(255),
    FIRST_FOUND         TIMESTAMP,
    INDEXERGUID         CHARACTER VARYING(255),
    LINK                CHARACTER VARYING(4000),
    PUB_DATE            TIMESTAMP,
    TITLE               CHARACTER VARYING(4000),
    INDEXER_ID          INTEGER,
    INDEXERSEARCHENTITY INTEGER,
    constraint UKFTFA80663URIMM78EPNXHYOM
        unique (INDEXER_ID, INDEXERGUID),
    constraint FK38P61YOKQR6VQP1O4PIITQW3Y
        foreign key (INDEXERSEARCHENTITY) references INDEXERSEARCH,
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
    ERROR            CHARACTER VARYING(255),
    EXTERNAL_ID      CHARACTER VARYING(255),
    IP               CHARACTER VARYING(255),
    NZB_ACCESS_TYPE  CHARACTER VARYING(255),
    STATUS           CHARACTER VARYING(255),
    TIME             TIMESTAMP,
    USER_AGENT       CHARACTER VARYING(255),
    USERNAME         CHARACTER VARYING(255),
    SEARCH_RESULT_ID BIGINT,
    constraint FKKKVQKFWF3XWDL4E3T084Y48SA
        foreign key (SEARCH_RESULT_ID) references SEARCHRESULT
            on delete cascade
);

create index NZB_DOWNLOAD_EXT_ID
    on INDEXERNZBDOWNLOAD (EXTERNAL_ID);

create table SEARCH_IDENTIFIERS
(
    SEARCH_ENTITY_ID INTEGER not null,
    IDENTIFIERS_ID   INTEGER not null
        constraint UK_FDRPCQVQAH7QDF5LGVREO76U3
            unique,
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
    IMDB_ID    CHARACTER VARYING(255)
        constraint UK_SOH2TEVC6PNSPB38YJY5F4EW3
            unique,
    POSTER_URL CHARACTER VARYING(255),
    TITLE      CHARACTER VARYING(255),
    TVDB_ID    CHARACTER VARYING(255)
        constraint UK_PGYJIFSNJSVJ1W9P0XVIDGP5E
            unique,
    TVMAZE_ID  CHARACTER VARYING(255)
        constraint UK_NJKRL57AGU954UJKOTT65HWHH
            unique,
    TVRAGE_ID  CHARACTER VARYING(255)
        constraint UK_GFWLXF98S7J77CF7G6FSFVSS0
            unique,
    YEAR       INTEGER
);

