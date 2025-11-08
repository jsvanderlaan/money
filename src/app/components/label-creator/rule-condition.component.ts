import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Output } from '@angular/core';
import { RuleCondition } from '../../../types/label.type';

@Component({
    selector: 'app-rule-condition',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex items-center gap-2">
            <select [value]="node().field" (change)="onFieldChange($event)" class="px-2 py-1 border border-gray-200 rounded pr-8">
                <option value="description">Description</option>
                <option value="merchant">Merchant</option>
                <option value="naam">Naam</option>
                <option value="type">Type</option>
                <option value="amount">Amount</option>
            </select>

            <select
                [value]="node().operator"
                (change)="onOperatorChange($event)"
                class="px-2 py-1 border border-gray-200 rounded pr-8"
            >
                <option value="includes" [hidden]="node().field === 'amount'">includes</option>
                <option value="is" [hidden]="node().field === 'amount'">is</option>
                <option value="gt">></option>
                <option value="lt"><</option>
            </select>

            <input
                type="text"
                [value]="node().value"
                (input)="onValueChange($event)"
                class="flex-1 px-2 py-1 border border-gray-200 rounded"
                placeholder="value"
            />

            <button type="button" class="px-2 py-1 text-sm text-red-600 hover:text-red-700" (click)="remove.emit()">
                Remove
            </button>
        </div>
    `,
})
export class RuleConditionComponent {
    readonly node = input.required<RuleCondition>();
    @Output() nodeChange = new EventEmitter<RuleCondition>();
    @Output() remove = new EventEmitter<void>();

    onFieldChange(event: Event) {
        const field = (event.target as HTMLSelectElement).value;
        const node = { ...this.node() };
        node.field = field as any;

        // Reset operator if switching to/from amount field
        if (field === 'amount' && (node.operator === 'includes' || node.operator === 'is')) {
            node.operator = 'gt';
        } else if (field !== 'amount' && (node.operator === 'gt' || node.operator === 'lt')) {
            node.operator = 'includes';
        }

        this.nodeChange.emit(node);
    }

    onOperatorChange(event: Event) {
        const operator = (event.target as HTMLSelectElement).value;
        this.nodeChange.emit({ ...this.node(), operator: operator as any });
    }

    onValueChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.nodeChange.emit({ ...this.node(), value });
    }
}
