package com.fraudguard.backend.transaction;

import com.fraudguard.backend.account.Account;
import com.fraudguard.backend.account.AccountRepository;
import com.fraudguard.backend.alert.Alert;
import com.fraudguard.backend.alert.AlertRepository;
import com.fraudguard.backend.audit.AuditLog;
import com.fraudguard.backend.audit.AuditLogRepository;
import com.fraudguard.backend.ml.MlClient;
import com.fraudguard.backend.rules.RuleContext;
import com.fraudguard.backend.rules.RuleEngine;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
public class TransactionService {

    public record Result(Transaction transaction, boolean created) {}

    private final TransactionRepository txns;
    private final AccountRepository accounts;
    private final AlertRepository alerts;
    private final AuditLogRepository audit;
    private final RuleEngine engine;
    private final MlClient ml;
    private final TransactionTemplate tx;

    public TransactionService(TransactionRepository txns, AccountRepository accounts,
                              AlertRepository alerts, AuditLogRepository audit,
                              RuleEngine engine, MlClient ml,
                              PlatformTransactionManager txManager) {
        this.txns = txns;
        this.accounts = accounts;
        this.alerts = alerts;
        this.audit = audit;
        this.engine = engine;
        this.ml = ml;
        this.tx = new TransactionTemplate(txManager);
    }

    public Result submit(String key, Long accountId, String merchant, BigDecimal amount,
                         String currency, String country, String deviceId,
                         Map<String, Double> features) {

        Optional<Transaction> existing = txns.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return replay(existing.get(), accountId, amount);
        }

        Account account = accounts.findById(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        RuleContext ctx = new RuleContext(account, amount, currency, country, deviceId, Instant.now());

        // The network call to the ML service happens BEFORE the database transaction starts.
        boolean mlRequested = features != null && !features.isEmpty();
        Optional<MlClient.MlResult> mlResult = ml.score(features);
        RuleEngine.Outcome outcome = engine.evaluate(ctx, mlResult);

        String reason = (mlRequested && mlResult.isEmpty())
                ? outcome.reason() + "; ML unavailable, rules only"
                : outcome.reason();
        String mlStatus = mlResult.isPresent() ? "used" : (mlRequested ? "unavailable" : "not_provided");

        try {
            Transaction saved = tx.execute(status -> persist(key, accountId, merchant, amount,
                    currency, country, deviceId, outcome, reason, mlStatus));
            return new Result(saved, true);
        } catch (DataIntegrityViolationException e) {
            // Two identical requests raced; the other one won. Return its result.
            Transaction winner = txns.findByIdempotencyKey(key).orElseThrow(() -> e);
            return replay(winner, accountId, amount);
        }
    }

    private Transaction persist(String key, Long accountId, String merchant, BigDecimal amount,
                                String currency, String country, String deviceId,
                                RuleEngine.Outcome outcome, String reason, String mlStatus) {
        Transaction t = new Transaction(accountId, key, merchant, amount, currency, country,
                deviceId, outcome.decision(), reason);
        t.setScores(outcome.ruleScore(), outcome.mlScore(), outcome.finalScore());
        Transaction saved = txns.save(t);

        if (outcome.decision() != Decision.APPROVE) {
            alerts.save(new Alert(saved.getId()));
        }

        String rulesText = outcome.triggered().isEmpty() ? "none" : String.join(",", outcome.triggered());
        audit.save(new AuditLog(saved.getId(), "DECISION",
                "decision=" + outcome.decision() + ", score=" + outcome.finalScore()
                        + ", rules=" + rulesText + ", ml=" + mlStatus));
        return saved;
    }

    private Result replay(Transaction saved, Long accountId, BigDecimal amount) {
        boolean sameRequest = saved.getAccountId().equals(accountId)
                && saved.getAmount().compareTo(amount) == 0;
        if (!sameRequest) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Idempotency key was already used with a different request");
        }
        return new Result(saved, false);
    }
}