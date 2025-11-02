import { Injectable } from '@angular/core';
import { Label } from '../types/label.type';
import { Transaction } from '../types/transaction.type';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    setObject(key: string, value: any) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    getObject<T>(key: string): T | null {
        const v = localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : null;
    }

    remove(key: string) {
        localStorage.removeItem(key);
    }

    saveTransactions(key: string, transactions: Transaction[]) {
        const payload = { transactions, savedAt: new Date().toISOString() };
        this.setObject(key, payload);
    }

    /**
     * Load transactions and revive date fields into Date objects.
     */
    loadTransactions(key: string): { transactions: Transaction[]; savedAt: string } | null {
        const v = this.getObject<{ transactions: any[]; savedAt: string }>(key);
        if (!v) return null;
        const transactions: Transaction[] = v.transactions.map((t: any) => ({
            ...t,
            date: t.date ? new Date(t.date) : undefined,
        }));
        return { transactions, savedAt: v.savedAt };
    }

    // Labels persistence
    saveLabels(key: string, labels: Label[]) {
        const payload = { labels, savedAt: new Date().toISOString() };
        this.setObject(key, payload);
    }

    loadLabels(key: string): { labels: Label[]; savedAt: string } | null {
        const v = this.getObject<{ labels: any[]; savedAt: string }>(key);
        if (!v) return null;
        // No special revival needed here; return as-is
        return { labels: v.labels as Label[], savedAt: v.savedAt };
    }
}
