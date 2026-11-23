package com.fraudguard.backend.alert;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "transaction_id", nullable = false, unique = true)
    private Long transactionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertStatus status = AlertStatus.OPEN;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Alert() {}

    public Alert(Long transactionId) {
        this.transactionId = transactionId;
    }

    public Long getId() { return id; }
    public Long getTransactionId() { return transactionId; }
    public AlertStatus getStatus() { return status; }
    public Long getReviewedBy() { return reviewedBy; }
    public Instant getReviewedAt() { return reviewedAt; }
    public Instant getCreatedAt() { return createdAt; }

    public void resolve(AlertStatus newStatus, Long reviewerId) {
        this.status = newStatus;
        this.reviewedBy = reviewerId;
        this.reviewedAt = Instant.now();
    }
}