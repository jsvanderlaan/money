import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { DEFAULT_LABELS } from '../constants/default-labels.contants';
import { Label, RuleCondition, RuleGroup, RuleHasLabel, RuleNode } from '../types/label.type';
import { Transaction } from '../types/transaction.type';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class LabelService {
    private readonly storageKey = 'labels';
    private readonly storage = inject(StorageService);
    readonly labels: WritableSignal<Label[] | null> = signal<Label[] | null>(null);

    constructor() {
        this.loadInitialData();
    }

    set(labels: Label[]) {
        const next = [...labels];
        this.storage.setObject(this.storageKey, { labels: next });
        this.labels.set(next);
    }

    getMatchingTransactions(label: Label, transactions: Transaction[], currentLabels: Label[]): Transaction[] {
        const clonedTransactions = transactions.map(t => ({
            ...t,
            labels: [] as { id: string; name: string; color: string }[],
        }));

        const existingIndex = currentLabels.findIndex(current => current.id === label.id);
        const labelsToApply =
            existingIndex >= 0
                ? currentLabels.map(current => (current.id === label.id ? label : current))
                : [...currentLabels, label];

        this.applyLabels(clonedTransactions, labelsToApply);
        return clonedTransactions.filter(t => (t.labels || []).some(applied => applied.id === label.id));
    }

    previewLabelImpact(
        draftLabel: Label,
        transactions: Transaction[],
        currentLabels: Label[]
    ): { count: number; sample: Transaction[] } {
        const matches = this.getMatchingTransactions(draftLabel, transactions, currentLabels);

        return {
            count: matches.length,
            sample: matches.slice(0, 5),
        };
    }

    private loadInitialData(): void {
        const v = this.storage.getObject<{ labels: any[] }>(this.storageKey);
        if (!v) {
            this.set(DEFAULT_LABELS);
        } else {
            this.labels.set(v.labels as Label[]);
        }
    }

    /** Apply an ordered list of labels to the transactions. Mutates transactions by adding tx.labels array. */
    applyLabels(transactions: Transaction[], labels: Label[]): Transaction[] {
        for (const tx of transactions) {
            tx.labels = tx.labels || [];
            // track applied ids on this tx in order
            const appliedIds: string[] = (tx.labels || []).map((l: { id: string }) => l.id);

            for (const label of labels) {
                if (!label.enabled) continue;
                // evaluate label rule against tx using current appliedIds
                const matches = this.evaluateNode(label.rules, tx, appliedIds);
                if (matches && !appliedIds.includes(label.id)) {
                    const ref = { id: label.id, name: label.name, color: label.color };
                    tx.labels.push(ref);
                    appliedIds.push(label.id);
                }
            }
        }

        return transactions;
    }

    /** Evaluate whether a rule node matches a transaction. appliedIds is the list of labels already applied to the transaction (ordering matters). */
    private evaluateNode(node: RuleNode, tx: Transaction, appliedIds: string[]): boolean {
        if (!node) return false;
        if (node.kind === 'condition') return this.evaluateCondition(node as RuleCondition, tx);
        if (node.kind === 'hasLabel') return appliedIds.includes((node as RuleHasLabel).labelId);
        if (node.kind === 'group') {
            const g = node as RuleGroup;
            if (!g.children || g.children.length === 0) return false;
            if (g.operator === 'and') return g.children.every((c: RuleNode) => this.evaluateNode(c, tx, appliedIds));
            return g.children.some((c: RuleNode) => this.evaluateNode(c, tx, appliedIds));
        }
        return false;
    }

    private evaluateCondition(cond: RuleCondition, tx: Transaction): boolean {
        const field = cond.field;
        const op = cond.operator;
        const rawVal = (cond.value ?? '').toString();
        const rawValTo = (cond.valueTo ?? '').toString();

        let target: string | number | Date | undefined = undefined;
        if (field === 'description') target = tx.description || '';
        if (field === 'merchant') target = tx.merchant || '';
        if (field === 'naam') target = tx.naam || '';
        if (field === 'type') target = (tx.type as any) || '';
        if (field === 'countryCode') target = tx.countryCode || '';
        if (field === 'date') target = tx.date;
        if (field === 'amount') target = tx.amount;

        if (field === 'date') {
            const from = rawVal ? new Date(rawVal) : null;
            const to = rawValTo ? new Date(rawValTo) : null;
            if (op === 'between') {
                if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) return false;
                const txTime = tx.date.getTime();
                const start = new Date(from);
                start.setHours(0, 0, 0, 0);
                const end = new Date(to);
                end.setHours(23, 59, 59, 999);
                return txTime >= start.getTime() && txTime <= end.getTime();
            }
            if (!from || isNaN(from.getTime())) return false;
            const txDate = new Date(tx.date);
            txDate.setHours(0, 0, 0, 0);
            const compareDate = new Date(from);
            compareDate.setHours(0, 0, 0, 0);
            if (op === 'is') return txDate.getTime() === compareDate.getTime();
            if (op === 'gt') return txDate.getTime() > compareDate.getTime();
            if (op === 'lt') return txDate.getTime() < compareDate.getTime();
            return false;
        }

        if (field === 'amount') {
            const num = parseFloat(rawVal);
            if (isNaN(num)) return false;
            if (op === 'gt') return tx.amount > num;
            if (op === 'lt') return tx.amount < num;
            if (op === 'is') return tx.amount === num;
            return false;
        }

        if (field === 'countryCode') {
            const sval = this.normalizeText((target ?? '').toString());
            const q = this.normalizeText(rawVal);
            if (!q) return false;
            if (op === 'is') return sval === q;
            if (op === 'includes') return sval.includes(q);
            return false;
        }

        const sval = this.normalizeText((target ?? '').toString());
        const q = this.normalizeText(rawVal);
        if (op === 'includes') {
            if (!q) return false;
            // Phrase-based includes: the complete input must appear in order.
            return sval.includes(q);
        }
        if (op === 'startsWith') {
            if (!q) return false;
            return sval.startsWith(q);
        }
        if (op === 'endsWith') {
            if (!q) return false;
            return sval.endsWith(q);
        }
        if (op === 'regex') {
            if (!rawVal.trim()) return false;
            try {
                return new RegExp(rawVal, 'i').test((target ?? '').toString());
            } catch {
                return false;
            }
        }
        if (op === 'is') return sval === q;
        return false;
    }

    private normalizeText(value: string): string {
        return value.toLowerCase().replace(/\s+/g, ' ').trim();
    }
}
