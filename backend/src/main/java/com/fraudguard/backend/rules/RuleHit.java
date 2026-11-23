package com.fraudguard.backend.rules;

import java.math.BigDecimal;

public record RuleHit(String code, BigDecimal weight, String message) {}