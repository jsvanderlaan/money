import { inject, Injectable, signal, WritableSignal } from '@angular/core';
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
        this.storage.setObject(this.storageKey, { labels });
        this.labels.set(labels);
    }

    private loadInitialData(): void {
        const v = this.storage.getObject<{ labels: any[] }>(this.storageKey);
        if (!v) return;
        this.labels.set(v.labels as Label[]);
    }

    /** Apply an ordered list of labels to the transactions. Mutates transactions by adding tx.labels array. */
    applyLabels(transactions: Transaction[]): Transaction[] {
        for (const tx of transactions) {
            tx.labels = tx.labels || [];
            // track applied ids on this tx in order
            const appliedIds: string[] = (tx.labels || []).map((l: { id: string }) => l.id);

            for (const label of this.labels() || []) {
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

        let target: string | number | undefined = undefined;
        if (field === 'description') target = tx.description || '';
        if (field === 'merchant') target = tx.merchant || '';
        if (field === 'naam') target = tx.naam || '';
        if (field === 'type') target = (tx.type as any) || '';
        if (field === 'amount') target = tx.amount;

        if (field === 'amount') {
            const num = parseFloat(rawVal);
            if (isNaN(num)) return false;
            if (op === 'gt') return tx.amount > num;
            if (op === 'lt') return tx.amount < num;
            if (op === 'is') return tx.amount === num;
            return false;
        }

        const sval = (target ?? '').toString().toLowerCase();
        const q = rawVal.toLowerCase();
        if (op === 'includes') return sval.includes(q);
        if (op === 'is') return sval === q;
        return false;
    }
}
