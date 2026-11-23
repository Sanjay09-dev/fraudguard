package com.fraudguard.backend.alert;

import com.fraudguard.backend.transaction.Decision;
import com.fraudguard.backend.transaction.Transaction;

import java.math.BigDecimal;
import java.time.Instant;

public record AlertResponse(Long id, AlertStatus status, Instant createdAt,
                            Long reviewedBy, Instant reviewedAt,
                            TransactionSummary transaction) {

    public record TransactionSummary(Long id, Long accountId, String merchant, BigDecimal amount,
                                     String currency, String country, Decision decision,
                                     BigDecimal score, String reason) {}

    public static AlertResponse of(Alert a, Transaction t) {
        TransactionSummary summary = (t == null) ? null : new TransactionSummary(
                t.getId(), t.getAccountId(), t.getMerchant(), t.getAmount(), t.getCurrency(),
                t.getCountry(), t.getDecision(), t.getFinalScore(), t.getDecisionReason());
        return new AlertResponse(a.getId(), a.getStatus(), a.getCreatedAt(),
                a.getReviewedBy(), a.getReviewedAt(), summary);
    }
}