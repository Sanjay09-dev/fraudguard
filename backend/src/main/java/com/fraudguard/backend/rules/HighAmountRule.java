package com.fraudguard.backend.rules;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
public class HighAmountRule implements FraudRule {

    private final BigDecimal threshold;

    public HighAmountRule(@Value("${fraud.high-amount-threshold}") BigDecimal threshold) {
        this.threshold = threshold;
    }

    @Override
    public Optional<RuleHit> evaluate(RuleContext ctx) {
        if (ctx.amount().compareTo(threshold) >= 0) {
            return Optional.of(new RuleHit("HIGH_AMOUNT", new BigDecimal("0.50"),
                    "amount " + ctx.amount() + " >= limit " + threshold));
        }
        return Optional.empty();
    }
}