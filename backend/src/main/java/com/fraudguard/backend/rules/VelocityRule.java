package com.fraudguard.backend.rules;

import com.fraudguard.backend.transaction.TransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
public class VelocityRule implements FraudRule {

    private final TransactionRepository txns;
    private final int maxPerMinute;

    public VelocityRule(TransactionRepository txns,
                        @Value("${fraud.velocity-max-per-minute}") int maxPerMinute) {
        this.txns = txns;
        this.maxPerMinute = maxPerMinute;
    }

    @Override
    public Optional<RuleHit> evaluate(RuleContext ctx) {
        long recent = txns.countByAccountIdAndCreatedAtAfter(
                ctx.account().getId(), ctx.now().minusSeconds(60));
        if (recent >= maxPerMinute) {
            return Optional.of(new RuleHit("VELOCITY", new BigDecimal("0.60"),
                    (recent + 1) + " transactions in the last 60 seconds"));
        }
        return Optional.empty();
    }
}