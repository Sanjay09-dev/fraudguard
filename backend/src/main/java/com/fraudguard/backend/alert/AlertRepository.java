package com.fraudguard.backend.alert;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    interface StatusCount {
        AlertStatus getStatus();
        Long getTotal();
    }

    Page<Alert> findByStatus(AlertStatus status, Pageable pageable);

    @Query("select a.status as status, count(a) as total from Alert a group by a.status")
    List<StatusCount> statusCounts();
}