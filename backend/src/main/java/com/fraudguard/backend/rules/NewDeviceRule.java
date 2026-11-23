package com.fraudguard.backend.rules;

import com.fraudguard.backend.transaction.TransactionRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
public class NewDeviceRule implements FraudRule {

    private final TransactionRepository txns;

    public NewDeviceRule(TransactionRepository txns) {
        this.txns = txns;
    }

    @Override
    public Optional<RuleHit> evaluate(RuleContext ctx) {
        String device = ctx.deviceId();
        Long accountId = ctx.account().getId();
        if (device == null || device.isBlank()) {
            return Optional.empty();
        }
        if (!txns.existsByAccountId(accountId)) {
            return Optional.empty();   // first transaction ever: nothing to compare with
        }
        if (txns.existsByAccountIdAndDeviceId(accountId, device)) {
            return Optional.empty();
        }
        return Optional.of(new RuleHit("NEW_DEVICE", new BigDecimal("0.25"),
                "device " + device + " not seen before on this account"));
    }
}