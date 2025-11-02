import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { Label, RuleNode } from '../../types/label.type';
import { LabelCreatorComponent } from '../components/label-creator/label-creator.component';

@Component({
    selector: 'app-labels',
    standalone: true,
    imports: [CommonModule, LabelCreatorComponent],
    templateUrl: './labels.component.html',
})
export class LabelsComponent implements OnInit {
    labels: Label[] = [];

    // Creation state (creator component is used)
    creating = false;

    private readonly storage = inject(StorageService);

    ngOnInit(): void {
        const payload = this.storage.loadLabels('labels');
        if (payload) {
            this.labels = payload.labels;
            return;
        }

        // If no saved labels, initialize with three mock labels
        // Use the new RuleNode AST so expressions like (A or B) and (C or D) are possible.
        this.labels = [
            {
                id: 'lbl_netflix',
                name: 'Netflix',
                color: '#E50914',
                enabled: true,
                // (type is 'Incasso algemeen doorlopend') AND (description includes 'netflix')
                rules: {
                    id: 'g1',
                    kind: 'group',
                    operator: 'and',
                    children: [
                        {
                            id: 'r1',
                            kind: 'condition',
                            field: 'type',
                            operator: 'is',
                            value: 'Incasso algemeen doorlopend',
                        },
                        {
                            id: 'r2',
                            kind: 'condition',
                            field: 'description',
                            operator: 'includes',
                            value: 'netflix',
                        },
                    ],
                },
            },
            {
                id: 'lbl_groceries',
                name: 'Groceries',
                color: '#10B981',
                enabled: true,
                rules: {
                    id: 'r3',
                    kind: 'condition',
                    field: 'description',
                    operator: 'includes',
                    value: 'supermarkt',
                },
            },
            {
                id: 'lbl_salary',
                name: 'Salary',
                color: '#3B82F6',
                enabled: false,
                rules: {
                    id: 'r4',
                    kind: 'condition',
                    field: 'description',
                    operator: 'includes',
                    value: 'salary',
                },
            },
        ];

        // Persist initial mock labels so user can toggle them
        this.storage.saveLabels('labels', this.labels);
    }

    toggleEnabled(label: Label) {
        label.enabled = !label.enabled;
        this.storage.saveLabels('labels', this.labels);
    }

    openCreate() {
        this.creating = true;
    }

    cancelCreate() {
        this.creating = false;
    }

    onLabelSaved(label: Label) {
        this.labels.push(label);
        this.storage.saveLabels('labels', this.labels);
        this.creating = false;
    }

    formatRule(node: RuleNode): string {
        if (!node) return '';

        if (node.kind === 'condition') {
            return `${node.field} ${node.operator} "${node.value}"`;
        }

        if (node.kind === 'hasLabel') {
            return `has label ${node.labelId}`;
        }

        if (node.kind === 'group') {
            const parts = node.children.map(c => this.formatRule(c));
            const joined = parts.join(` ${node.operator.toUpperCase()} `);
            return `(${joined})`;
        }

        return '';
    }
}
