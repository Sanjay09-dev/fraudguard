package com.fraudguard.backend.alert;

import com.fraudguard.backend.audit.AuditLog;
import com.fraudguard.backend.audit.AuditLogRepository;
import com.fraudguard.backend.transaction.Transaction;
import com.fraudguard.backend.transaction.TransactionRepository;
import com.fraudguard.backend.user.User;
import com.fraudguard.backend.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class AlertService {

    private final AlertRepository alerts;
    private final TransactionRepository txns;
    private final UserRepository users;
    private final AuditLogRepository audit;

    public AlertService(AlertRepository alerts, TransactionRepository txns,
                        UserRepository users, AuditLogRepository audit) {
        this.alerts = alerts;
        this.txns = txns;
        this.users = users;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<AlertResponse> list(AlertStatus status, int page, int size) {
        Pageable p = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Alert> rows = (status == null ? alerts.findAll(p) : alerts.findByStatus(status, p))
                .getContent();

        // One query for all the transactions, instead of one query per alert
        Map<Long, Transaction> byId = txns
                .findAllById(rows.stream().map(Alert::getTransactionId).toList())
                .stream()
                .collect(Collectors.toMap(Transaction::getId, Function.identity()));

        return rows.stream().map(a -> AlertResponse.of(a, byId.get(a.getTransactionId()))).toList();
    }

    @Transactional
    public AlertResponse resolve(Long alertId, AlertStatus newStatus, String reviewerUsername) {
        if (newStatus == AlertStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Status must be CONFIRMED_FRAUD or FALSE_POSITIVE");
        }
        Alert alert = alerts.findById(alertId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alert not found"));
        if (alert.getStatus() != AlertStatus.OPEN) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Alert was already reviewed");
        }
        User reviewer = users.findByUsername(reviewerUsername)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown reviewer"));

        alert.resolve(newStatus, reviewer.getId());
        audit.save(new AuditLog(alert.getTransactionId(), "ALERT_REVIEWED",
                "alert=" + alert.getId() + ", status=" + newStatus + ", reviewer=" + reviewerUsername));

        Transaction t = txns.findById(alert.getTransactionId()).orElse(null);
        return AlertResponse.of(alert, t);
    }
}