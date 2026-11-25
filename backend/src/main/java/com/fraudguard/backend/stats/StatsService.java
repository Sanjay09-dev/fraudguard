package com.fraudguard.backend.stats;

import com.fraudguard.backend.alert.AlertRepository;
import com.fraudguard.backend.alert.AlertStatus;
import com.fraudguard.backend.transaction.Decision;
import com.fraudguard.backend.transaction.TransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StatsService {

    public record DailyPoint(String date, long approve, long review, long block) {}

    public record Stats(long totalTransactions, long openAlerts,
                        Map<String, Long> decisions, Map<String, Long> alertStatuses,
                        List<DailyPoint> daily) {}

    private final TransactionRepository txns;
    private final AlertRepository alerts;

    public StatsService(TransactionRepository txns, AlertRepository alerts) {
        this.txns = txns;
        this.alerts = alerts;
    }

    @Transactional(readOnly = true)
    public Stats compute() {
        Map<String, Long> decisions = new LinkedHashMap<>();
        for (Decision d : Decision.values()) decisions.put(d.name(), 0L);
        txns.decisionCounts().forEach(r -> decisions.put(r.getDecision().name(), r.getTotal()));
        long total = decisions.values().stream().mapToLong(Long::longValue).sum();

        Map<String, Long> statuses = new LinkedHashMap<>();
        for (AlertStatus s : AlertStatus.values()) statuses.put(s.name(), 0L);
        alerts.statusCounts().forEach(r -> statuses.put(r.getStatus().name(), r.getTotal()));

        // Last 7 days (UTC), with zeros for days that had no traffic
        LocalDate first = LocalDate.now(ZoneOffset.UTC).minusDays(6);
        Instant since = first.atStartOfDay().toInstant(ZoneOffset.UTC);
        Map<String, long[]> byDay = new LinkedHashMap<>();
        for (int i = 0; i < 7; i++) byDay.put(first.plusDays(i).toString(), new long[3]);
        for (var row : txns.dailyCounts(since)) {
            long[] slot = byDay.get(row.getDay());
            if (slot == null) continue;
            switch (Decision.valueOf(row.getDecision())) {
                case APPROVE -> slot[0] = row.getTotal();
                case REVIEW -> slot[1] = row.getTotal();
                case BLOCK -> slot[2] = row.getTotal();
            }
        }
        List<DailyPoint> daily = byDay.entrySet().stream()
                .map(e -> new DailyPoint(e.getKey(), e.getValue()[0], e.getValue()[1], e.getValue()[2]))
                .toList();

        return new Stats(total, statuses.get("OPEN"), decisions, statuses, daily);
    }
}