package com.fraudguard.backend.rules;

import java.util.Optional;

public interface FraudRule {
    Optional<RuleHit> evaluate(RuleContext ctx);
}