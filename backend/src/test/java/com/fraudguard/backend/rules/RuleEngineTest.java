package com.fraudguard.backend.rules;

import com.fraudguard.backend.ml.MlClient;
import com.fraudguard.backend.transaction.Decision;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static com.fraudguard.backend.rules.TestData.account;
import static com.fraudguard.backend.rules.TestData.ctx;
import static org.assertj.core.api.Assertions.assertThat;

class RuleEngineTest {

    private static final BigDecimal REVIEW = new BigDecimal("0.40");
    private static final BigDecimal BLOCK = new BigDecimal("0.80");

    private final RuleContext context = ctx(account(1, "IN"), "100", "IN", "dev-1");

    /** A rule that always fires with the given weight. */
    private static FraudRule rule(String code, String weight) {
        return c -> Optional.of(new RuleHit(code, new BigDecimal(weight), code + " fired"));
    }

    private static RuleEngine engine(FraudRule... rules) {
        return new RuleEngine(List.of(rules), REVIEW, BLOCK);
    }

    private static Optional<MlClient.MlResult> ml(String score) {
        return Optional.of(new MlClient.MlResult(new BigDecimal(score), new BigDecimal("0.9000")));
    }

    @Test
    void noRulesMeansApprove() {
        var outcome = engine().evaluate(context, Optional.empty());
        assertThat(outcome.decision()).isEqualTo(Decision.APPROVE);
        assertThat(outcome.finalScore()).isEqualByComparingTo("0");
        assertThat(outcome.reason()).isEqualTo("No rules triggered");
    }

    @Test
    void aWeakSignalAloneIsStillApproved() {
        var outcome = engine(rule("FOREIGN_COUNTRY", "0.35")).evaluate(context, Optional.empty());
        assertThat(outcome.decision()).isEqualTo(Decision.APPROVE);
    }

    @Test
    void aModerateRuleGoesToReview() {
        var outcome = engine(rule("HIGH_AMOUNT", "0.50")).evaluate(context, Optional.empty());
        assertThat(outcome.decision()).isEqualTo(Decision.REVIEW);
        assertThat(outcome.finalScore()).isEqualByComparingTo("0.50");
    }

    @Test
    void combinedRulesAreBlocked() {
        var outcome = engine(rule("HIGH_AMOUNT", "0.50"), rule("FOREIGN_COUNTRY", "0.35"))
                .evaluate(context, Optional.empty());
        assertThat(outcome.decision()).isEqualTo(Decision.BLOCK);
        assertThat(outcome.finalScore()).isEqualByComparingTo("0.85");
        assertThat(outcome.triggered()).containsExactly("HIGH_AMOUNT", "FOREIGN_COUNTRY");
    }

    @Test
    void ruleScoreIsCappedAtOne() {
        var outcome = engine(rule("A", "0.60"), rule("B", "0.60")).evaluate(context, Optional.empty());
        assertThat(outcome.ruleScore()).isEqualByComparingTo("1.0");
    }

    @Test
    void mlScoreWinsWhenItIsHigherThanTheRules() {
        var outcome = engine(rule("NEW_DEVICE", "0.25")).evaluate(context, ml("0.90"));
        assertThat(outcome.ruleScore()).isEqualByComparingTo("0.25");
        assertThat(outcome.mlScore()).isEqualByComparingTo("0.90");
        assertThat(outcome.finalScore()).isEqualByComparingTo("0.90");
        assertThat(outcome.decision()).isEqualTo(Decision.BLOCK);
        assertThat(outcome.triggered()).contains("ML_MODEL");
    }

    @Test
    void ruleScoreWinsWhenItIsHigherThanMl() {
        var outcome = engine(rule("HIGH_AMOUNT", "0.50")).evaluate(context, ml("0.30"));
        assertThat(outcome.finalScore()).isEqualByComparingTo("0.50");
        assertThat(outcome.decision()).isEqualTo(Decision.REVIEW);
        assertThat(outcome.mlScore()).isEqualByComparingTo("0.30");
        assertThat(outcome.triggered()).doesNotContain("ML_MODEL");
    }

    @Test
    void missingMlResultFallsBackToRulesOnly() {
        var outcome = engine(rule("HIGH_AMOUNT", "0.50")).evaluate(context, Optional.empty());
        assertThat(outcome.mlScore()).isNull();
        assertThat(outcome.finalScore()).isEqualByComparingTo("0.50");
    }
}