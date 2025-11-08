import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, input, Output } from '@angular/core';
import { LabelService } from '../../../services/label.service';
import { RuleHasLabel } from '../../../types/label.type';

@Component({
    selector: 'app-rule-has-label',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="flex items-center gap-2">
            <label class="text-sm">Has label:</label>
            <select
                [value]="node().labelId"
                (change)="onLabelChange($event)"
                class="px-2 py-1 border border-gray-200 rounded pr-8"
            >
                <option value="">-- select label --</option>
                @for (opt of availableLabels(); track opt.id) {
                    <option [value]="opt.id">{{ opt.name }}</option>
                }
            </select>

            <button type="button" class="px-2 py-1 text-sm text-red-600 hover:text-red-700" (click)="remove.emit()">
                Remove
            </button>
        </div>
    `,
})
export class RuleHasLabelComponent {
    readonly node = input.required<RuleHasLabel>();
    readonly availableLabels = inject(LabelService).labels;
    @Output() nodeChange = new EventEmitter<RuleHasLabel>();
    @Output() remove = new EventEmitter<void>();

    onLabelChange(event: Event) {
        const labelId = (event.target as HTMLSelectElement).value;
        this.nodeChange.emit({ ...this.node(), labelId });
    }
}
