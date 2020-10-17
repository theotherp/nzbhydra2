CREATE TABLE IF NOT EXISTS NOTIFICATION
(
    ID                      INTEGER PRIMARY KEY NOT NULL,
    NOTIFICATION_EVENT_TYPE VARCHAR(255)        NOT NULL,
    MESSAGE_TYPE            VARCHAR(255)        NOT NULL,
    TITLE                   VARCHAR(255),
    BODY                    VARCHAR(255)        NOT NULL,
    URLS                    VARCHAR(255)        NOT NULL,
    TIME                    TIMESTAMP           NOT NULL,
    DISPLAYED               BOOLEAN             NOT NULL DEFAULT false
);