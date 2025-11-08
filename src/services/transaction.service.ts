import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Transaction } from '../types/transaction.type';
import { FilterService } from './filter.service';
import { LabelService } from './label.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class TransactionService {
    private readonly storageKey = 'uploaded_tabs_transactions';
    private readonly storage = inject(StorageService);
    private readonly filterService = inject(FilterService);
    private readonly labelService = inject(LabelService);

    private readonly transactionsCache: WritableSignal<Transaction[] | null> = signal<Transaction[] | null>(null);

    readonly minDate = computed(() => {
        const transactions = this.transactionsCache() ?? [];
        return transactions.reduce((min, t) => (t.date < min ? t.date : min), transactions[0].date);
    });
    readonly maxDate = computed(() => {
        const transactions = this.transactionsCache() ?? [];
        return transactions.reduce((max, t) => (t.date > max ? t.date : max), transactions[0].date);
    });

    // Computed transactions applying sort and filter
    readonly transactions = computed(() => {
        let result = [...(this.transactionsCache() || [])];

        // Apply description filter from FilterService
        const filterValues = this.filterService.descriptionWords();
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

        // Apply date range filter
        const from = this.filterService.dateFrom();
        const to = this.filterService.dateTo();
        if (from) result = result.filter(t => t.date >= from);
        if (to) result = result.filter(t => t.date <= to);

        // Apply label filter
        const labelIds = this.filterService.selectedLabelIds();
        if (labelIds && labelIds.length) {
            result = result.filter(t => (t.labels || []).some(l => labelIds.includes(l.id)));
        }

        // Apply sorting
        const { field, direction } = this.filterService.sort();
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

        // Apply labels
        this.labelService.applyLabels(result);

        return result;
    });

    constructor() {
        this.loadInitialData();
    }

    set(transactions: Transaction[]): void {
        const labeledTransactions = this.labelService.applyLabels(transactions);
        this.storage.setObject(this.storageKey, { transactions: labeledTransactions });
        this.transactionsCache.set(labeledTransactions);
    }

    clear(): void {
        this.storage.remove(this.storageKey);
        this.transactionsCache.set(null);
    }

    private loadInitialData(): void {
        const v = this.storage.getObject<{ transactions: any[] }>(this.storageKey);
        if (!v) return;
        const transactions: Transaction[] = v.transactions.map((t: any) => ({
            ...t,
            date: t.date ? new Date(t.date) : undefined,
        }));
        this.transactionsCache.set(transactions);
    }
}
