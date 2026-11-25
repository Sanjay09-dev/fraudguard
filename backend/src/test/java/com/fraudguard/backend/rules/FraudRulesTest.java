package com.fraudguard.backend.rules;

import com.fraudguard.backend.transaction.TransactionRepository;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static com.fraudguard.backend.rules.TestData.account;
import static com.fraudguard.backend.rules.TestData.ctx;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FraudRulesTest {

    @Nested
    class HighAmount {
        private final HighAmountRule rule = new HighAmountRule(new BigDecimal("50000"));

        @Test
        void triggersExactlyAtTheLimit() {
            Optional<RuleHit> hit = rule.evaluate(ctx(account(1, "IN"), "50000", "IN", "dev-1"));
            assertThat(hit).isPresent();
            assertThat(hit.get().code()).isEqualTo("HIGH_AMOUNT");
            assertThat(hit.get().weight()).isEqualByComparingTo("0.50");
        }

        @Test
        void staysQuietJustBelowTheLimit() {
            assertThat(rule.evaluate(ctx(account(1, "IN"), "49999.99", "IN", "dev-1"))).isEmpty();
        }
    }

    @Nested
    class ForeignCountry {
        private final ForeignCountryRule rule = new ForeignCountryRule();

        @Test
        void triggersWhenCountryDiffersFromHome() {
            Optional<RuleHit> hit = rule.evaluate(ctx(account(1, "IN"), "100", "US", "dev-1"));
            assertThat(hit).isPresent();
            assertThat(hit.get().code()).isEqualTo("FOREIGN_COUNTRY");
            assertThat(hit.get().weight()).isEqualByComparingTo("0.35");
        }

        @Test
        void ignoresLetterCaseWhenCountryMatches() {
            assertThat(rule.evaluate(ctx(account(1, "IN"), "100", "in", "dev-1"))).isEmpty();
        }
    }

    @Nested
    class Velocity {
        private final TransactionRepository repo = mock(TransactionRepository.class);
        private final VelocityRule rule = new VelocityRule(repo, 5);

        private void recentTransactions(long count) {
            when(repo.countByAccountIdAndCreatedAtAfter(eq(1L), any(Instant.class))).thenReturn(count);
        }

        @Test
        void staysQuietBelowTheLimit() {
            recentTransactions(4);
            assertThat(rule.evaluate(ctx(account(1, "IN"), "100", "IN", "dev-1"))).isEmpty();
        }

        @Test
        void triggersWhenTheLimitIsReached() {
            recentTransactions(5);
            Optional<RuleHit> hit = rule.evaluate(ctx(account(1, "IN"), "100", "IN", "dev-1"));
            assertThat(hit).isPresent();
            assertThat(hit.get().code()).isEqualTo("VELOCITY");
            assertThat(hit.get().weight()).isEqualByComparingTo("0.60");
            assertThat(hit.get().message()).contains("6 transactions");   // the 5 earlier ones plus this one
        }
    }

    @Nested
    class NewDevice {
        private final TransactionRepository repo = mock(TransactionRepository.class);
        private final NewDeviceRule rule = new NewDeviceRule(repo);

        @Test
        void firstEverTransactionIsNotFlagged() {
            when(repo.existsByAccountId(1L)).thenReturn(false);
            assertThat(rule.evaluate(ctx(account(1, "IN"), "100", "IN", "dev-9"))).isEmpty();
        }

        @Test
        void knownDeviceIsNotFlagged() {
            when(repo.existsByAccountId(1L)).thenReturn(true);
            when(repo.existsByAccountIdAndDeviceId(1L, "dev-1")).thenReturn(true);
            assertThat(rule.evaluate(ctx(account(1, "IN"), "100", "IN", "dev-1"))).isEmpty();
        }

        @Test
        void unknownDeviceOnAnAccountWithHistoryIsFlagged() {
            when(repo.existsByAccountId(1L)).thenReturn(true);
            when(repo.existsByAccountIdAndDeviceId(1L, "dev-9")).thenReturn(false);
            Optional<RuleHit> hit = rule.evaluate(ctx(account(1, "IN"), "100", "IN", "dev-9"));
            assertThat(hit).isPresent();
            assertThat(hit.get().code()).isEqualTo("NEW_DEVICE");
            assertThat(hit.get().weight()).isEqualByComparingTo("0.25");
        }

        @Test
        void missingDeviceIdIsIgnored() {
            when(repo.existsByAccountId(1L)).thenReturn(true);
            assertThat(rule.evaluate(ctx(account(1, "IN"), "100", "IN", null))).isEmpty();
        }
    }
}