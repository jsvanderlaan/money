import { CommonModule } from '@angular/common';
import { Component, EventEmitter, input, OnInit, Output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Label, RuleCondition, RuleGroup, RuleNode } from '../../../types/label.type';
import { AddRuleButtonsComponent } from './add-rule-buttons.component';
import { RuleComponent } from './rule.component';

@Component({
    selector: 'app-label-creator',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RuleComponent, AddRuleButtonsComponent],
    templateUrl: './label-creator.component.html',
})
export class LabelCreatorComponent implements OnInit {
    @Output() saved = new EventEmitter<Label>();
    @Output() cancel = new EventEmitter<void>();

    readonly rootRule = signal<RuleNode | null>(null);
    readonly labelToEdit = input<Label | null>();

    readonly nameControl = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(50)],
    });
    readonly colorControl = new FormControl('#3B82F6', { nonNullable: true, validators: [Validators.required] });

    ngOnInit(): void {
        const editing = this.labelToEdit();
        if (editing) {
            this.nameControl.setValue(editing.name);
            this.colorControl.setValue(editing.color);

            this.rootRule.set(this.deepCloneRule(editing.rules) as RuleGroup);
        } else {
            this.rootRule.set(null);
        }
    }

    onRootAdd(root: RuleNode) {
        this.rootRule.set(root);
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
            return !!node.field && !!node.operator && node.value.trim().length > 0;
        }
        if (node.kind === 'hasLabel') {
            return !!node.labelId && node.labelId.length > 0;
        }
        if (node.kind === 'group') {
            if (!node.children || node.children.length === 0) return false;
            return node.children.every(c => this.validateRule(c));
        }
        return false;
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
}
