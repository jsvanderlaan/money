import { Injectable, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { CoverageStats, TransactionService } from './transaction.service';

export interface CoverageSnapshot extends CoverageStats {
    capturedAt: string;
    reason: string;
}

@Injectable({
    providedIn: 'root',
})
export class CoverageMetricsService {
    private readonly storageKey = 'tx_coverage_snapshots';
    private readonly maxSnapshots = 200;
    private readonly transactionService = inject(TransactionService);
    private readonly storage = inject(StorageService);
    private readonly lastSignature = signal<string>('');

    readonly snapshots = signal<CoverageSnapshot[]>([]);

    constructor() {
        const stored = this.storage.getObject<CoverageSnapshot[]>(this.storageKey) || [];
        this.snapshots.set(stored);

        effect(() => {
            const stats = this.transactionService.coverageStats();
            if (!stats.total) return;

            const signature = `${stats.total}|${stats.labeled}|${stats.unlabeled}`;
            if (signature === this.lastSignature()) return;

            this.lastSignature.set(signature);
            this.captureSnapshot('auto-baseline', stats);
        });
    }

    captureSnapshot(reason = 'manual', stats = this.transactionService.coverageStats()): void {
        const snapshot: CoverageSnapshot = {
            capturedAt: new Date().toISOString(),
            reason,
            ...stats,
        };

        const next = [...this.snapshots(), snapshot].slice(-this.maxSnapshots);
        this.snapshots.set(next);
        this.storage.setObject(this.storageKey, next);
    }
}
