import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LabelService } from '../../../services/label.service';
import { TransactionService } from '../../../services/transaction.service';
import { Label, RuleCondition, RuleGroup, RuleNode } from '../../../types/label.type';
import { Transaction } from '../../../types/transaction.type';
import { AddRuleButtonsComponent } from './add-rule-buttons.component';
import { RuleComponent } from './rule.component';

export interface LabelDraft {
    name: string;
    color: string;
    rules: RuleNode;
}

interface ImpactPreviewSnapshot {
    draft: { count: number; sample: Transaction[] };
    current: { count: number; sample: Transaction[] };
    delta: number;
    overlaps: Array<{ label: Label; count: number }>;
    affectedCount: number;
}

@Component({
    selector: 'app-label-creator',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RuleComponent, AddRuleButtonsComponent],
    templateUrl: './label-creator.component.html',
})
export class LabelCreatorComponent implements OnInit {
    @Output() saved = new EventEmitter<Label>();
    @Output() cancel = new EventEmitter<void>();

    readonly rootRule = signal<RuleNode | null>(null);
    readonly impactPreview = signal<ImpactPreviewSnapshot | null>(null);
    readonly impactPreviewStale = signal(true);
    readonly transactionScope = signal<'unlabeled' | 'labeled' | 'all'>('unlabeled');
    readonly transactionSearch = signal('');
    readonly labelToEdit = input<Label | null>();
    readonly initialDraft = input<LabelDraft | null>();

    private readonly txService = inject(TransactionService);
    private readonly labelService = inject(LabelService);
    private readonly destroyRef = inject(DestroyRef);

    readonly nameControl = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(50)],
    });
    readonly colorControl = new FormControl('#3B82F6', { nonNullable: true, validators: [Validators.required] });

    readonly countryCodes = computed(() => {
        const codes = new Set<string>();
        for (const tx of this.txService.sourceTransactions()) {
            const code = tx.countryCode?.trim();
            if (code) codes.add(code.toUpperCase());
        }
        return Array.from(codes).sort();
    });

    readonly transactionExplorerResults = computed(() => {
        const query = this.transactionSearch().trim().toLowerCase();
        const scope = this.transactionScope();
        const transactions = this.txService.allLabeledTransactions();

        return transactions.filter(tx => {
            const hasLabels = (tx.labels || []).length > 0;
            if (scope === 'unlabeled' && hasLabels) return false;
            if (scope === 'labeled' && !hasLabels) return false;

            if (!query) return true;

            const haystack = [
                tx.description,
                tx.merchant,
                tx.naam,
                tx.type,
                tx.countryCode,
                tx.amount?.toString(),
                tx.date instanceof Date ? tx.date.toISOString() : String(tx.date),
                ...(tx.labels || []).map(label => label.name),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    });

    readonly ruleWarnings = computed(() => {
        const rootRule = this.rootRule();
        if (!rootRule || !this.validateRule(rootRule)) return null;

        return {
            hasLabelDependency: this.containsHasLabel(rootRule),
        };
    });

    constructor() {
        this.nameControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.markImpactDirty());
        this.colorControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.markImpactDirty());
    }

    ngOnInit(): void {
        const editing = this.labelToEdit();
        if (editing) {
            this.nameControl.setValue(editing.name, { emitEvent: false });
            this.colorControl.setValue(editing.color, { emitEvent: false });
            this.rootRule.set(this.deepCloneRule(editing.rules) as RuleGroup);
        } else {
            const draft = this.initialDraft();
            if (draft) {
                this.nameControl.setValue(draft.name, { emitEvent: false });
                this.colorControl.setValue(draft.color, { emitEvent: false });
                this.rootRule.set(this.deepCloneRule(draft.rules));
            } else {
                this.colorControl.setValue(this.randomColor(), { emitEvent: false });
                this.rootRule.set(null);
            }
        }

        this.markImpactDirty();
    }

    onRootAdd(root: RuleNode) {
        this.rootRule.set(root);
        this.markImpactDirty();
    }

    onRootChange(root: RuleNode) {
        this.rootRule.set(root);
        this.markImpactDirty();
    }

    onRootRemove() {
        this.rootRule.set(null);
        this.markImpactDirty();
    }

    wrapRootInGroup(operator: 'and' | 'or' = 'and') {
        const root = this.rootRule();
        if (!root || root.kind === 'group') return;
        this.rootRule.set({
            id: this.genId('grp'),
            kind: 'group',
            operator,
            children: [root],
        });
        this.markImpactDirty();
    }

    unwrapRootGroup() {
        const root = this.rootRule();
        if (!root || root.kind !== 'group' || root.children.length !== 1) return;
        this.rootRule.set(root.children[0]);
        this.markImpactDirty();
    }

    makeCondition(): RuleCondition {
        return { id: this.genId('cond'), kind: 'condition', field: 'description', operator: 'includes', value: '' };
    }

    makeGroup(operator: 'and' | 'or', children: RuleNode[] = []): RuleGroup {
        return { id: this.genId('grp'), kind: 'group', operator, children };
    }

    validateRule(node: RuleNode | null): boolean {
        if (!node) return false;
        if (node.kind === 'condition') {
            if (!node.field || !node.operator) return false;
            if (node.field === 'date') {
                if (node.operator === 'between') {
                    return this.isValidDate(node.value) && this.isValidDate(node.valueTo);
                }
                return this.isValidDate(node.value);
            }
            if (node.field === 'amount') {
                return node.value.trim().length > 0 && !Number.isNaN(Number(node.value));
            }
            if (node.field === 'countryCode') {
                return node.value.trim().length > 0;
            }
            return !!node.value && node.value.trim().length > 0;
        }
        if (node.kind === 'hasLabel') {
            return !!node.labelId && node.labelId.length > 0;
        }
        if (node.kind === 'group') {
            if (!node.children || node.children.length === 0) return false;
            return node.children.every(child => this.validateRule(child));
        }
        return false;
    }

    containsHasLabel(node: RuleNode | null): boolean {
        if (!node) return false;
        if (node.kind === 'hasLabel') return true;
        if (node.kind === 'group') return node.children.some(child => this.containsHasLabel(child));
        return false;
    }

    canRefreshImpact(): boolean {
        const rootRule = this.rootRule();
        return !!rootRule && this.validateRule(rootRule);
    }

    refreshImpactPreview() {
        const rootRule = this.rootRule();
        if (!rootRule || !this.validateRule(rootRule)) return;

        const editing = this.labelToEdit();
        const allLabels = this.labelService.labels() || [];
        const txs = this.txService.sourceTransactions();
        const draftLabel: Label = {
            id: editing?.id || '__draft_preview__',
            name: this.nameControl.value.trim() || 'Draft label',
            color: this.colorControl.value.trim() || '#3B82F6',
            enabled: true,
            rules: rootRule,
        };

        const draftMatches = this.labelService.getMatchingTransactions(draftLabel, txs, allLabels);
        const draftSet = new Set(draftMatches);
        const overlaps = allLabels
            .filter(label => label.id !== draftLabel.id)
            .map(label => ({
                label,
                count: this.labelService.getMatchingTransactions(label, txs, allLabels).filter(tx => draftSet.has(tx)).length,
            }))
            .filter(entry => entry.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        const draft = this.labelService.previewLabelImpact(draftLabel, txs, allLabels);
        const current = editing
            ? this.labelService.previewLabelImpact(editing, txs, allLabels)
            : { count: 0, sample: [] as Transaction[] };

        this.impactPreview.set({
            draft,
            current,
            delta: draft.count - current.count,
            overlaps,
            affectedCount: draftMatches.length,
        });
        this.impactPreviewStale.set(false);
    }

    saveNewLabel() {
        const name = this.nameControl.value.trim();
        const color = this.colorControl.value.trim();
        const rootRule = this.rootRule();
        if (!name || name.length === 0) return;
        if (name.length > 50) return;
        if (!color) return;
        if (!rootRule || !this.validateRule(rootRule)) return;

        const editing = this.labelToEdit();
        const label: Label = {
            id: editing?.id || this.genId('lbl'),
            name,
            color,
            enabled: editing?.enabled ?? true,
            rules: rootRule,
        };

        this.saved.emit(label);
    }

    cancelCreate() {
        this.cancel.emit();
    }

    setTransactionScope(scope: 'unlabeled' | 'labeled' | 'all') {
        this.transactionScope.set(scope);
    }

    clearTransactionSearch() {
        this.transactionSearch.set('');
    }

    markImpactDirty() {
        this.impactPreviewStale.set(true);
    }

    private deepCloneRule(rule: RuleNode): RuleNode {
        if (rule.kind === 'condition') {
            return { ...rule, id: this.genId('cond') };
        }
        if (rule.kind === 'hasLabel') {
            return { ...rule, id: this.genId('has') };
        }
        if (rule.kind === 'group') {
            return {
                ...rule,
                id: this.genId('grp'),
                children: rule.children.map(child => this.deepCloneRule(child)),
            };
        }
        throw new Error('Unknown rule type');
    }

    private genId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    private randomColor(): string {
        const palette = ['#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#F97316', '#8B5CF6', '#EC4899', '#EF4444'];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    private isValidDate(value?: string): boolean {
        if (!value || !value.trim()) return false;
        return !Number.isNaN(new Date(value).getTime());
    }
}
