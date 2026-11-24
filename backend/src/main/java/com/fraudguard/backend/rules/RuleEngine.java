package com.fraudguard.backend.rules;

import com.fraudguard.backend.ml.MlClient;
import com.fraudguard.backend.transaction.Decision;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class RuleEngine {

    public record Outcome(BigDecimal ruleScore, BigDecimal mlScore, BigDecimal finalScore,
                          Decision decision, String reason, List<String> triggered) {}

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

    public Outcome evaluate(RuleContext ctx, Optional<MlClient.MlResult> ml) {
        List<RuleHit> hits = rules.stream()
                .map(rule -> rule.evaluate(ctx))
                .flatMap(Optional::stream)
                .toList();

        BigDecimal ruleScore = hits.stream()
                .map(RuleHit::weight)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .min(BigDecimal.ONE)
                .setScale(4, RoundingMode.HALF_UP);

        BigDecimal mlScore = ml.map(MlClient.MlResult::score).orElse(null);
        BigDecimal finalScore = (mlScore != null && mlScore.compareTo(ruleScore) > 0)
                ? mlScore : ruleScore;

        Decision decision;
        if (finalScore.compareTo(blockThreshold) >= 0) {
            decision = Decision.BLOCK;
        } else if (finalScore.compareTo(reviewThreshold) >= 0) {
            decision = Decision.REVIEW;
        } else {
            decision = Decision.APPROVE;
        }

        List<String> triggered = new ArrayList<>();
        List<String> parts = new ArrayList<>();
        for (RuleHit h : hits) {
            triggered.add(h.code());
            parts.add(h.code() + " (" + h.message() + ")");
        }
        if (mlScore != null && mlScore.compareTo(reviewThreshold) >= 0) {
            triggered.add("ML_MODEL");
            parts.add("ML_MODEL (fraud probability " + ml.get().probability()
                    + ", score " + mlScore + ")");
        }
        String reason = parts.isEmpty() ? "No rules triggered" : String.join("; ", parts);

        return new Outcome(ruleScore, mlScore, finalScore, decision, reason, triggered);
    }
}