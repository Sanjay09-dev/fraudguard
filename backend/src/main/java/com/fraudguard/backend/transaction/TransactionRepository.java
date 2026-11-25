package com.fraudguard.backend.transaction;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    interface DecisionCount {
        Decision getDecision();
        Long getTotal();
    }

    interface DailyCount {
        String getDay();
        String getDecision();
        Long getTotal();
    }

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);
    List<Transaction> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);
    List<Transaction> findByDecisionOrderByCreatedAtDesc(Decision decision, Pageable pageable);
    List<Transaction> findByAccountIdAndDecisionOrderByCreatedAtDesc(Long accountId, Decision decision, Pageable pageable);
    long countByAccountIdAndCreatedAtAfter(Long accountId, Instant since);
    boolean existsByAccountId(Long accountId);
    boolean existsByAccountIdAndDeviceId(Long accountId, String deviceId);

    @Query("select t.decision as decision, count(t) as total from Transaction t group by t.decision")
    List<DecisionCount> decisionCounts();

    @Query(value = """
            SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
                   decision AS decision,
                   count(*) AS total
            FROM transactions
            WHERE created_at >= :since
            GROUP BY 1, 2
            ORDER BY 1
            """, nativeQuery = true)
    List<DailyCount> dailyCounts(@Param("since") Instant since);
}