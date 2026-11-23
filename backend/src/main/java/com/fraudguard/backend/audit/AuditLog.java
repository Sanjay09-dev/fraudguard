package com.fraudguard.backend.audit;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "event_type", nullable = false, length = 40)
    private String eventType;

    @Column(columnDefinition = "text")
    private String details;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected AuditLog() {}

    public AuditLog(Long transactionId, String eventType, String details) {
        this.transactionId = transactionId;
        this.eventType = eventType;
        this.details = details;
    }

    public Long getId() { return id; }
    public Long getTransactionId() { return transactionId; }
    public String getEventType() { return eventType; }
    public String getDetails() { return details; }
    public Instant getCreatedAt() { return createdAt; }
}