import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, inject, input, Output } from '@angular/core';
import { TransactionService } from '../../../services/transaction.service';
import { LabelRuleOperator, RuleCondition } from '../../../types/label.type';

@Component({
    selector: 'app-rule-condition',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="grid gap-2 md:grid-cols-[180px_180px_minmax(0,1fr)_auto] md:items-center">
            <select [value]="node().field" (change)="onFieldChange($event)" class="px-2 py-1 border border-gray-200 rounded pr-8">
                <option value="description">Description</option>
                <option value="merchant">Merchant</option>
                <option value="naam">Naam</option>
                <option value="type">Type</option>
                <option value="amount">Amount</option>
                <option value="date">Date</option>
                <option value="countryCode">Country code</option>
            </select>

            <select
                [value]="node().operator"
                (change)="onOperatorChange($event)"
                class="px-2 py-1 border border-gray-200 rounded pr-8"
            >
                @for (option of operatorOptions(); track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                }
            </select>

            @if (node().field === 'date' && node().operator === 'between') {
                <div class="grid gap-2 sm:grid-cols-2">
                    <input
                        type="date"
                        [value]="node().value"
                        (input)="onValueChange($event)"
                        class="px-2 py-1 border border-gray-200 rounded"
                    />
                    <input
                        type="date"
                        [value]="node().valueTo || ''"
                        (input)="onValueToChange($event)"
                        class="px-2 py-1 border border-gray-200 rounded"
                    />
                </div>
            } @else if (node().field === 'date') {
                <input
                    type="date"
                    [value]="node().value"
                    (input)="onValueChange($event)"
                    class="px-2 py-1 border border-gray-200 rounded"
                />
            } @else if (node().field === 'countryCode') {
                <input
                    type="text"
                    [value]="node().value"
                    (input)="onValueChange($event)"
                    class="px-2 py-1 border border-gray-200 rounded"
                    [attr.list]="countryListId"
                    placeholder="Country code"
                />
                <datalist [id]="countryListId">
                    @for (code of countryCodes(); track code) {
                        <option [value]="code"></option>
                    }
                </datalist>
            } @else {
                <input
                    type="text"
                    [value]="node().value"
                    (input)="onValueChange($event)"
                    class="px-2 py-1 border border-gray-200 rounded"
                    [placeholder]="placeholder()"
                />
            }

            <div class="flex items-center gap-2 justify-end">
                <button type="button" class="px-2 py-1 text-sm text-gray-600 hover:text-gray-900" (click)="wrap.emit()">
                    Wrap
                </button>
                <button type="button" class="px-2 py-1 text-sm text-red-600 hover:text-red-700" (click)="remove.emit()">
                    Remove
                </button>
            </div>
        </div>
    `,
})
export class RuleConditionComponent {
    readonly node = input.required<RuleCondition>();
    private readonly txService = inject(TransactionService);
    readonly countryListId = `country-code-options-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    readonly countryCodes = computed(() => {
        const codes = new Set<string>();
        for (const tx of this.txService.sourceTransactions()) {
            const code = tx.countryCode?.trim();
            if (code) codes.add(code.toUpperCase());
        }
        return Array.from(codes).sort();
    });
    @Output() nodeChange = new EventEmitter<RuleCondition>();
    @Output() remove = new EventEmitter<void>();
    @Output() wrap = new EventEmitter<void>();

    placeholder(): string {
        if (this.node().field === 'date') return 'date';
        return this.node().operator === 'regex'
            ? 'regex pattern'
            : this.node().operator === 'startsWith'
              ? 'prefix'
              : this.node().operator === 'endsWith'
                ? 'suffix'
                : 'value (full phrase for includes)';
    }

    operatorOptions(): Array<{ value: LabelRuleOperator; label: string }> {
        const field = this.node().field;
        if (field === 'amount') {
            return [
                { value: 'gt', label: '>' },
                { value: 'lt', label: '<' },
                { value: 'is', label: '=' },
            ];
        }
        if (field === 'date') {
            return [
                { value: 'between', label: 'between' },
                { value: 'is', label: 'is' },
                { value: 'gt', label: 'after' },
                { value: 'lt', label: 'before' },
            ];
        }
        if (field === 'countryCode') {
            return [
                { value: 'is', label: 'is' },
                { value: 'includes', label: 'includes' },
            ];
        }
        return [
            { value: 'includes', label: 'includes' },
            { value: 'is', label: 'is' },
            { value: 'startsWith', label: 'starts with' },
            { value: 'endsWith', label: 'ends with' },
            { value: 'regex', label: 'regex' },
        ];
    }

    onFieldChange(event: Event) {
        const field = (event.target as HTMLSelectElement).value;
        const node = { ...this.node() };
        node.field = field as any;

        if (field === 'amount') {
            node.operator = 'gt';
            node.valueTo = undefined;
        } else if (field === 'date') {
            node.operator = 'between';
        } else if (field === 'countryCode') {
            node.operator = 'is';
            node.valueTo = undefined;
        } else if (node.operator === 'gt' || node.operator === 'lt' || node.operator === 'between') {
            node.operator = 'includes';
            node.valueTo = undefined;
        }

        if (field !== 'date') {
            node.valueTo = undefined;
        }

        this.nodeChange.emit(node);
    }

    onOperatorChange(event: Event) {
        const operator = (event.target as HTMLSelectElement).value;
        const node = { ...this.node() };
        node.operator = operator as any;
        if (operator !== 'between') {
            node.valueTo = undefined;
        }
        this.nodeChange.emit(node);
    }

    onValueChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.nodeChange.emit({ ...this.node(), value });
    }

    onValueToChange(event: Event) {
        const valueTo = (event.target as HTMLInputElement).value;
        this.nodeChange.emit({ ...this.node(), valueTo });
    }
}
