package com.fraudguard.backend.rules;

import com.fraudguard.backend.transaction.Decision;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class RuleEngine {

    public record Outcome(BigDecimal score, Decision decision, String reason, List<String> triggered) {}

    private final List<FraudRule> rules;
    private final BigDecimal reviewThreshold;
    private final BigDecimal blockThreshold;

    public RuleEngine(List<FraudRule> rules,
                      @Value("${fraud.review-threshold}") BigDecimal reviewThreshold,
                      @Value("${fraud.block-threshold}") BigDecimal blockThreshold) {
        this.rules = rules;
        this.reviewThreshold = reviewThreshold;
        this.blockThreshold = blockThreshold;
    }

    public Outcome evaluate(RuleContext ctx) {
        List<RuleHit> hits = rules.stream()
                .map(rule -> rule.evaluate(ctx))
                .flatMap(Optional::stream)
                .toList();

        BigDecimal score = hits.stream()
                .map(RuleHit::weight)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .min(BigDecimal.ONE)
                .setScale(4, RoundingMode.HALF_UP);

        Decision decision;
        if (score.compareTo(blockThreshold) >= 0) {
            decision = Decision.BLOCK;
        } else if (score.compareTo(reviewThreshold) >= 0) {
            decision = Decision.REVIEW;
        } else {
            decision = Decision.APPROVE;
        }

        String reason = hits.isEmpty()
                ? "No rules triggered"
                : hits.stream().map(h -> h.code() + " (" + h.message() + ")")
                        .collect(Collectors.joining("; "));

        return new Outcome(score, decision, reason, hits.stream().map(RuleHit::code).toList());
    }
}