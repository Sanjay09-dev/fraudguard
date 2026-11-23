package com.fraudguard.backend.rules;

import com.fraudguard.backend.account.Account;

import java.math.BigDecimal;
import java.time.Instant;

public record RuleContext(Account account, BigDecimal amount, String currency,
                          String country, String deviceId, Instant now) {}