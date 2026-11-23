package com.fraudguard.backend.rules;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

@Component
public class ForeignCountryRule implements FraudRule {

    @Override
    public Optional<RuleHit> evaluate(RuleContext ctx) {
        String home = ctx.account().getHomeCountry();
        if (!ctx.country().equalsIgnoreCase(home)) {
            return Optional.of(new RuleHit("FOREIGN_COUNTRY", new BigDecimal("0.35"),
                    "country " + ctx.country() + " differs from home country " + home));
        }
        return Optional.empty();
    }
}