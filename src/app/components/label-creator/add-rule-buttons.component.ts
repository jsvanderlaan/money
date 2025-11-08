import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RuleNode } from '../../../types/label.type';

@Component({
    selector: 'app-add-rule-buttons',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="ml-auto flex items-center gap-2">
            <button
                type="button"
                class="px-2 py-1 text-sm bg-white border rounded"
                (click)="addCondition()"
                title="Add condition"
            >
                + Condition
            </button>

            <button type="button" class="px-2 py-1 text-sm bg-white border rounded" (click)="addGroup()" title="Add group">
                + Group
            </button>

            <button type="button" class="px-2 py-1 text-sm bg-white border rounded" (click)="addHasLabel()" title="Add has label">
                + Has label
            </button>

            @if (showRemove) {
                <button
                    type="button"
                    class="px-2 py-1 text-sm text-red-600 hover:text-red-700"
                    (click)="remove.emit()"
                    title="Remove group"
                >
                    Remove group
                </button>
            }
        </div>
    `,
})
export class AddRuleButtonsComponent {
    @Input() showRemove = false;
    @Output() add = new EventEmitter<RuleNode>();
    @Output() remove = new EventEmitter<void>();

    addCondition() {
        this.add.emit({ id: this.genId('cond'), kind: 'condition', field: 'description', operator: 'includes', value: '' });
    }
    addGroup() {
        this.add.emit({
            id: this.genId('grp'),
            kind: 'group',
            operator: 'and',
            children: [{ id: this.genId('cond'), kind: 'condition', field: 'description', operator: 'includes', value: '' }],
        });
    }
    addHasLabel() {
        this.add.emit({ id: this.genId('has'), kind: 'hasLabel', labelId: '' });
    }

    private genId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
}
