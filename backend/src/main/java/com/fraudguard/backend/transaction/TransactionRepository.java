package com.fraudguard.backend.transaction;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);
    List<Transaction> findByAccountIdOrderByCreatedAtDesc(Long accountId, Pageable pageable);
    long countByAccountIdAndCreatedAtAfter(Long accountId, Instant since);
    boolean existsByAccountId(Long accountId);
    boolean existsByAccountIdAndDeviceId(Long accountId, String deviceId);
}