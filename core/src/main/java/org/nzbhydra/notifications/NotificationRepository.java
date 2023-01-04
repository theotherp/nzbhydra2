package org.nzbhydra.notifications;


import org.nzbhydra.config.notification.NotificationEventType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Integer> {

    NotificationEntity findByNotificationEventType(NotificationEventType notificationEventType);

    List<NotificationEntity> findAllByDisplayedFalseOrderByTimeDesc();


}
