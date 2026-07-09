import { Injectable, computed, inject } from '@angular/core';
import { RuleNode } from '../types/label.type';
import { Transaction } from '../types/transaction.type';
import { TransactionService } from './transaction.service';

export type PatternType = 'merchant' | 'naam';

export interface UnlabeledPattern {
    id: string;
    type: PatternType;
    label: string;
    key: string;
    count: number;
    totalAmount: number;
    lastSeen: Date;
    coverageDeltaEstimate: number;
    sample: Transaction[];
    suggestedRule: RuleNode;
    suggestedName: string;
}

interface PatternAccumulator {
    id: string;
    type: PatternType;
    label: string;
    key: string;
    transactions: Transaction[];
}

@Injectable({
    providedIn: 'root',
})
export class UnlabeledPatternsService {
    private readonly txService = inject(TransactionService);

    readonly patterns = computed<UnlabeledPattern[]>(() => {
        const all = this.txService.allLabeledTransactions();
        const unlabeled = all.filter(t => (t.labels || []).length === 0);
        if (!unlabeled.length) return [];

        const groups = new Map<string, PatternAccumulator>();

        for (const tx of unlabeled) {
            const candidates = this.toCandidates(tx);
            for (const c of candidates) {
                const key = `${c.type}:${c.key}`;
                if (!groups.has(key)) {
                    groups.set(key, {
                        id: key,
                        type: c.type,
                        label: c.label,
                        key: c.key,
                        transactions: [],
                    });
                }
                groups.get(key)!.transactions.push(tx);
            }
        }

        const totalUnlabeled = unlabeled.length;

        return Array.from(groups.values())
            .filter(g => g.transactions.length >= 2)
            .map(g => {
                const count = g.transactions.length;
                const totalAmount = g.transactions.reduce((sum, tx) => sum + tx.amount, 0);
                const lastSeen = g.transactions.reduce(
                    (latest, tx) => (tx.date > latest ? tx.date : latest),
                    g.transactions[0].date
                );
                const coverageDeltaEstimate = Math.round((count / totalUnlabeled) * 1000) / 10;

                return {
                    id: g.id,
                    type: g.type,
                    label: g.label,
                    key: g.key,
                    count,
                    totalAmount,
                    lastSeen,
                    coverageDeltaEstimate,
                    sample: g.transactions.slice(0, 5),
                    suggestedRule: this.toSuggestedRule(g.type, g.label),
                    suggestedName: this.toSuggestedName(g.type, g.label),
                };
            })
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return Math.abs(b.totalAmount) - Math.abs(a.totalAmount);
            })
            .slice(0, 25);
    });

    private toCandidates(tx: Transaction): Array<{ type: PatternType; key: string; label: string }> {
        const out: Array<{ type: PatternType; key: string; label: string }> = [];

        const merchant = (tx.merchant || '').trim();
        if (merchant) {
            out.push({ type: 'merchant', key: this.normalize(merchant), label: merchant });
        }

        const naam = (tx.naam || '').trim();
        if (naam) {
            out.push({ type: 'naam', key: this.normalize(naam), label: naam });
        }

        return out;
    }

    private toSuggestedRule(type: PatternType, value: string): RuleNode {
        const idBase = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        if (type === 'merchant') {
            return {
                id: `cond_${idBase}`,
                kind: 'condition',
                field: 'merchant',
                operator: 'includes',
                value,
            };
        }

        if (type === 'naam') {
            return {
                id: `cond_${idBase}`,
                kind: 'condition',
                field: 'naam',
                operator: 'includes',
                value,
            };
        }

        throw new Error(`Unsupported pattern type: ${type}`);
    }

    private toSuggestedName(type: PatternType, value: string): string {
        return value.length > 50 ? value.slice(0, 50) : value;
    }

    private normalize(value: string): string {
        return value.toLowerCase().replace(/\s+/g, ' ').trim();
    }
}
