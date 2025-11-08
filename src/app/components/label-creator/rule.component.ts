import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Output } from '@angular/core';
import { RuleNode } from '../../../types/label.type';
import { RuleConditionComponent } from './rule-condition.component';
import { RuleGroupComponent } from './rule-group.component';
import { RuleHasLabelComponent } from './rule-has-label.component';

@Component({
    selector: 'app-rule',
    standalone: true,
    imports: [CommonModule, RuleConditionComponent, RuleHasLabelComponent, RuleGroupComponent],
    template: `
        @let thisNode = node();
        @if (thisNode) {
            @switch (thisNode.kind) {
                @case ('condition') {
                    <app-rule-condition [node]="thisNode" (nodeChange)="onChange($event)" (remove)="onRemove(thisNode)" />
                }
                @case ('hasLabel') {
                    <app-rule-has-label [node]="thisNode" (nodeChange)="onChange($event)" (remove)="onRemove(thisNode)" />
                }
                @case ('group') {
                    <app-rule-group [node]="thisNode" (nodeChange)="onChange($event)" (remove)="onRemove(thisNode)" />
                }
            }
        }
    `,
})
export class RuleComponent {
    readonly node = input<RuleNode>();

    @Output() nodeChange = new EventEmitter<RuleNode>();
    @Output() remove = new EventEmitter<void>();

    onRemove(node: RuleNode) {
        this.remove.emit();
    }

    onChange(newNode: RuleNode) {
        this.nodeChange.emit(newNode);
    }
}
