package com.fraudguard.backend.transaction;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "transactions")
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 64)
    private String idempotencyKey;

    @Column(nullable = false, length = 100)
    private String merchant;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, length = 2)
    private String country;

    @Column(name = "device_id", length = 64)
    private String deviceId;

    @Column(name = "rule_score", precision = 5, scale = 4)
    private BigDecimal ruleScore;

    @Column(name = "ml_score", precision = 5, scale = 4)
    private BigDecimal mlScore;

    @Column(name = "final_score", precision = 5, scale = 4)
    private BigDecimal finalScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Decision decision;

    @Column(name = "decision_reason", columnDefinition = "text")
    private String decisionReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Transaction() {}

    public Transaction(Long accountId, String idempotencyKey, String merchant, BigDecimal amount,
                       String currency, String country, String deviceId,
                       Decision decision, String decisionReason) {
        this.accountId = accountId;
        this.idempotencyKey = idempotencyKey;
        this.merchant = merchant;
        this.amount = amount;
        this.currency = currency;
        this.country = country;
        this.deviceId = deviceId;
        this.decision = decision;
        this.decisionReason = decisionReason;
    }

    public Long getId() { return id; }
    public Long getAccountId() { return accountId; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public String getMerchant() { return merchant; }
    public BigDecimal getAmount() { return amount; }
    public String getCurrency() { return currency; }
    public String getCountry() { return country; }
    public String getDeviceId() { return deviceId; }
    public Decision getDecision() { return decision; }
    public String getDecisionReason() { return decisionReason; }
    public Instant getCreatedAt() { return createdAt; }
        public void setScores(BigDecimal ruleScore, BigDecimal finalScore) {
        this.ruleScore = ruleScore;
        this.finalScore = finalScore;
    }

    public BigDecimal getFinalScore() { return finalScore; }
}