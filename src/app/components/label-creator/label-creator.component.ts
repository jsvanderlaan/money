import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, EventEmitter, input, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Label, RuleCondition, RuleGroup, RuleHasLabel, RuleNode } from '../../../types/label.type';

@Component({
    selector: 'app-label-creator',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './label-creator.component.html',
})
export class LabelCreatorComponent implements OnInit {
    @Output() saved = new EventEmitter<Label>();
    @Output() cancel = new EventEmitter<void>();

    readonly existingLabels = input.required<Label[]>();
    readonly availableLabelOptions = computed(() => this.existingLabels().map(l => ({ id: l.id, name: l.name })));

    nameControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(50)] });
    colorControl = new FormControl('#3B82F6', { nonNullable: true, validators: [Validators.required] });

    rootRule: RuleNode | null = null;

    constructor(private cd: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.rootRule = this.makeGroup('and', [this.makeCondition()]);
    }

    private genId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    makeCondition(): RuleCondition {
        return { id: this.genId('cond'), kind: 'condition', field: 'description', operator: 'includes', value: '' };
    }

    makeHasLabel(labelId = ''): RuleHasLabel {
        return { id: this.genId('has'), kind: 'hasLabel', labelId };
    }

    makeGroup(operator: 'and' | 'or', children: RuleNode[] = []): RuleGroup {
        return { id: this.genId('grp'), kind: 'group', operator, children };
    }

    addChildToGroup(group: any, kind: 'condition' | 'group' | 'hasLabel') {
        if (kind === 'condition') {
            group.children.push(this.makeCondition());
            return;
        }

        if (kind === 'group') {
            group.children.push(this.makeGroup('and', [this.makeCondition()]));
            // schedule a tick to avoid ExpressionChangedAfterItHasBeenCheckedError when the
            // view updates synchronously after manipulating nested nodes
            setTimeout(() => this.cd.detectChanges());
            return;
        }

        if (kind === 'hasLabel') {
            group.children.push(this.makeHasLabel(''));
            // adding a hasLabel node can create a value that the template binds to
            // and sometimes changes during the current CD cycle. Defer a detectChanges
            // to the next tick so Angular's check won't throw ExpressionChangedAfterItHasBeenCheckedError.
            setTimeout(() => this.cd.detectChanges());
            return;
        }
    }

    removeChildFromGroup(group: any, index: number) {
        group.children.splice(index, 1);
    }

    setGroupOperator(group: any, op: string) {
        if (!group) return;
        group.operator = op;
    }

    setConditionField(cond: any, field: string) {
        cond.field = field;
        if (field === 'amount' && (cond.operator === 'includes' || cond.operator === 'is')) {
            cond.operator = 'gt';
        }
    }

    setConditionOperator(cond: any, op: string) {
        cond.operator = op;
    }

    setConditionValue(cond: any, value: string) {
        cond.value = value;
    }

    setHasLabel(node: any, labelId: string) {
        node.labelId = labelId;
    }

    getGroupOperator(node: any) {
        return node && node.operator ? node.operator : 'and';
    }

    getChildren(node: any) {
        return (node && node.children) || [];
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

        if (!name || name.length === 0) return;
        if (name.length > 50) return;
        if (!color) return;
        if (!this.rootRule || !this.validateRule(this.rootRule)) return;

        const newLabel: Label = {
            id: this.genId('lbl'),
            name,
            color,
            enabled: true,
            rules: this.rootRule,
        };

        this.saved.emit(newLabel);
    }

    cancelCreate() {
        this.cancel.emit();
    }
}
