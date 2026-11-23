package com.fraudguard.backend.account;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "accounts")
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_number", nullable = false, unique = true, length = 20)
    private String accountNumber;

    @Column(name = "holder_name", nullable = false, length = 100)
    private String holderName;

    @Column(name = "home_country", nullable = false, length = 2)
    private String homeCountry;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Account() {}

    public Account(String accountNumber, String holderName, String homeCountry) {
        this.accountNumber = accountNumber;
        this.holderName = holderName;
        this.homeCountry = homeCountry;
    }

    public Long getId() { return id; }
    public String getAccountNumber() { return accountNumber; }
    public String getHolderName() { return holderName; }
    public String getHomeCountry() { return homeCountry; }
    public Instant getCreatedAt() { return createdAt; }
}