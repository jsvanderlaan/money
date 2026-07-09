import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, Output } from '@angular/core';
import { RuleGroup, RuleNode } from '../../../types/label.type';
import { AddRuleButtonsComponent } from './add-rule-buttons.component';
import { RuleConditionComponent } from './rule-condition.component';
import { RuleHasLabelComponent } from './rule-has-label.component';

export interface LabelOption {
    id: string;
    name: string;
}

@Component({
    selector: 'app-rule-group',
    standalone: true,
    imports: [CommonModule, RuleConditionComponent, RuleHasLabelComponent, AddRuleButtonsComponent],
    template: `
        <div class="border border-gray-100 rounded p-3">
            <div class="flex items-center gap-3 mb-2">
                <label class="text-sm">{{ 'Group operator:' }}</label>
                <select
                    [value]="node().operator"
                    (change)="onOperatorChange($event)"
                    class="px-2 py-1 border border-gray-200 rounded pr-8"
                >
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                </select>

                <app-add-rule-buttons
                    [showRemove]="true"
                    (add)="addChild($any($event))"
                    (remove)="remove.emit()"
                ></app-add-rule-buttons>
            </div>

            <div class="space-y-2">
                @for (child of node().children; track child.id) {
                    <div [class.pl-3]="child.kind === 'group'" class="border border-gray-100 rounded bg-white p-2">
                        <div class="mb-2 flex items-center justify-end gap-2 text-xs text-gray-500">
                            @if (child.kind !== 'group') {
                                <button
                                    type="button"
                                    class="rounded border border-gray-200 bg-white px-2 py-1"
                                    (click)="wrapChild(child)"
                                >
                                    Wrap
                                </button>
                            }
                            @if (child.kind === 'group' && child.children.length === 1) {
                                <button
                                    type="button"
                                    class="rounded border border-gray-200 bg-white px-2 py-1"
                                    (click)="unwrapChild(child)"
                                >
                                    Unwrap
                                </button>
                            }
                        </div>
                        @switch (child.kind) {
                            @case ('condition') {
                                <app-rule-condition
                                    [node]="child"
                                    (nodeChange)="onChildChange(child, $event)"
                                    (wrap)="wrapChild(child)"
                                    (remove)="removeChild(child)"
                                />
                            }
                            @case ('hasLabel') {
                                <app-rule-has-label
                                    [node]="child"
                                    (nodeChange)="onChildChange(child, $event)"
                                    (wrap)="wrapChild(child)"
                                    (remove)="removeChild(child)"
                                />
                            }
                            @case ('group') {
                                <app-rule-group
                                    [node]="child"
                                    (nodeChange)="onChildChange(child, $event)"
                                    (remove)="removeChild(child)"
                                />
                            }
                        }
                    </div>
                }
            </div>
        </div>
    `,
})
export class RuleGroupComponent {
    readonly node = input.required<RuleGroup>();

    @Output() nodeChange = new EventEmitter<RuleGroup>();
    @Output() remove = new EventEmitter<void>();

    onOperatorChange(event: Event) {
        const operator = (event.target as HTMLSelectElement).value as 'and' | 'or';
        this.nodeChange.emit({ ...this.node(), operator });
    }

    addChild(newChild: RuleNode) {
        const node = this.node();

        this.nodeChange.emit({
            ...node,
            children: [...node.children, newChild],
        });
    }

    wrapChild(child: RuleNode) {
        if (child.kind === 'group') return;
        const node = this.node();
        this.nodeChange.emit({
            ...node,
            children: node.children.map(c =>
                c.id === child.id
                    ? {
                          id: this.genId('grp'),
                          kind: 'group',
                          operator: 'and',
                          children: [c],
                      }
                    : c
            ),
        });
    }

    unwrapChild(child: RuleNode) {
        if (child.kind !== 'group' || child.children.length !== 1) return;
        const node = this.node();
        this.nodeChange.emit({
            ...node,
            children: node.children.flatMap(c => (c.id === child.id ? [child.children[0]] : [c])),
        });
    }

    removeChild(child: RuleNode) {
        const node = this.node();
        this.nodeChange.emit({
            ...node,
            children: node.children.filter(c => c.id !== child.id),
        });
    }

    onChildChange(oldChild: RuleNode, newChild: RuleNode) {
        const node = this.node();
        this.nodeChange.emit({
            ...node,
            children: node.children.map(c => (c.id === oldChild.id ? newChild : c)),
        });
    }

    private genId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
}
