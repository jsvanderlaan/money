import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Transaction } from '../types/transaction.type';
import { FilterService } from './filter.service';
import { LabelService } from './label.service';
import { StorageService } from './storage.service';

export interface CoverageStats {
    total: number;
    labeled: number;
    unlabeled: number;
    unlabeledPercentage: number;
}

export interface TransactionIngestOptions {
    includeDuplicates?: boolean;
}

export interface TransactionIngestResult {
    total: number;
    stored: number;
    skippedDuplicates: number;
    includeDuplicates: boolean;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
    private readonly storageKey = 'uploaded_tabs_transactions';
    private readonly storage = inject(StorageService);
    private readonly filterService = inject(FilterService);
    private readonly labelService = inject(LabelService);
    private readonly transactionsCache: WritableSignal<Transaction[] | null> = signal<Transaction[] | null>(null);

    readonly sourceTransactions = computed(() => {
        const transactions = this.transactionsCache() ?? [];
        return transactions.map(t => ({
            ...t,
            labels: [] as { id: string; name: string; color: string }[],
        }));
    });

    readonly minDate = computed(() => {
        const transactions = this.transactionsCache() ?? [];
        if (!transactions.length) return null;
        return transactions.reduce((min, t) => (t.date < min ? t.date : min), transactions[0].date);
    });
    readonly maxDate = computed(() => {
        const transactions = this.transactionsCache() ?? [];
        if (!transactions.length) return null;
        return transactions.reduce((max, t) => (t.date > max ? t.date : max), transactions[0].date);
    });

    readonly allLabeledTransactions = computed(() => {
        const transactions = this.sourceTransactions();
        if (!transactions.length) return [];
        const labels = this.labelService.labels() || [];
        const result = transactions.map(t => ({ ...t }));
        this.labelService.applyLabels(result, labels);
        return result;
    });

    readonly coverageStats = computed<CoverageStats>(() => {
        const all = this.allLabeledTransactions();
        const total = all.length;
        const labeled = all.filter(t => (t.labels || []).length > 0).length;
        const unlabeled = total - labeled;
        const unlabeledPercentage = total > 0 ? Math.round((unlabeled / total) * 1000) / 10 : 0;
        return { total, labeled, unlabeled, unlabeledPercentage };
    });

    readonly transactions = computed(() => {
        const transactions = this.allLabeledTransactions();
        if (!transactions.length) return [];
        const filterValues = this.filterService.descriptionWords();
        const from = this.filterService.dateFrom();
        const to = this.filterService.dateTo();
        const labelIds = this.filterService.selectedLabelIds();
        const unlabeledOnly = this.filterService.unlabeledOnly();
        const { field, direction } = this.filterService.sort();

        let result = [...transactions];

        if (filterValues.length > 0) {
            result = result.filter(t =>
                filterValues.every(
                    filterValue =>
                        t.description.toLowerCase().includes(filterValue) ||
                        t.merchant?.toLowerCase().includes(filterValue) ||
                        t.naam?.toLowerCase().includes(filterValue)
                )
            );
        }

        if (from) result = result.filter(t => t.date >= from);
        if (to) result = result.filter(t => t.date <= to);

        if (labelIds && labelIds.length) {
            result = result.filter(t => (t.labels || []).some(l => labelIds.includes(l.id)));
        }

        if (unlabeledOnly) {
            result = result.filter(t => (t.labels || []).length === 0);
        }

        result.sort((a, b) => {
            const modifier = direction === 'asc' ? 1 : -1;

            if (field === 'date') {
                return (a.date.getTime() - b.date.getTime()) * modifier;
            }

            if (field === 'amount') {
                return (a.amount - b.amount) * modifier;
            }

            return 0;
        });

        return result;
    });

    constructor() {
        this.loadInitialData();
    }

    set(transactions: Transaction[], options: TransactionIngestOptions = {}): TransactionIngestResult {
        const includeDuplicates = options.includeDuplicates ?? false;
        const filteredTransactions = includeDuplicates ? [...transactions] : this.deduplicateTransactions(transactions);
        const normalizedTransactions = this.assignTransactionIds(filteredTransactions);

        this.storage.setObject(this.storageKey, { transactions: normalizedTransactions });
        this.transactionsCache.set(normalizedTransactions);

        return {
            total: transactions.length,
            stored: normalizedTransactions.length,
            skippedDuplicates: transactions.length - filteredTransactions.length,
            includeDuplicates,
        };
    }

    clear(): void {
        this.storage.remove(this.storageKey);
        this.transactionsCache.set(null);
    }

    private loadInitialData(): void {
        const v = this.storage.getObject<{ transactions: any[] }>(this.storageKey);
        if (!v) return;
        const transactions: Transaction[] = this.assignTransactionIds(
            v.transactions.map((t: any) => ({
                ...t,
                date: t.date ? new Date(t.date) : undefined,
            }))
        );
        this.transactionsCache.set(transactions);
    }

    private deduplicateTransactions(transactions: Transaction[]): Transaction[] {
        const seen = new Set<string>();
        const unique: Transaction[] = [];

        for (const transaction of transactions) {
            const fingerprint = this.createFingerprint(transaction);
            if (seen.has(fingerprint)) continue;

            seen.add(fingerprint);
            unique.push(transaction);
        }

        return unique;
    }

    private createFingerprint(transaction: Transaction): string {
        return [
            transaction.date instanceof Date ? transaction.date.toISOString() : String(transaction.date),
            transaction.amount,
            transaction.currency,
            transaction.description?.trim().toLowerCase() || '',
            transaction.merchant?.trim().toLowerCase() || '',
            transaction.naam?.trim().toLowerCase() || '',
            transaction.type || '',
            transaction.balanceStart ?? '',
            transaction.balanceEnd ?? '',
            transaction.pasNumber || '',
            transaction.nr || '',
            transaction.iban || '',
            transaction.bic || '',
            transaction.kenmerk || '',
        ].join('::');
    }

    private assignTransactionIds(transactions: Transaction[]): Transaction[] {
        return transactions.map((transaction, index) => ({
            ...transaction,
            id: transaction.id || `${this.createFingerprint(transaction)}::${index}`,
        }));
    }
}
