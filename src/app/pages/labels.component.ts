import { Component, inject } from '@angular/core';
import { LabelService } from '../../services/label.service';
import { Label, RuleNode } from '../../types/label.type';
import { LabelCreatorComponent } from '../components/label-creator/label-creator.component';

@Component({
    selector: 'app-labels',
    standalone: true,
    imports: [LabelCreatorComponent],
    templateUrl: './labels.component.html',
})
export class LabelsComponent {
    // Creation/edit state
    creating = false;
    editingLabel: Label | null = null;

    private readonly labelService = inject(LabelService);
    readonly labels = this.labelService.labels;

    toggleEnabled(label: Label) {
        label.enabled = !label.enabled;
        this.labelService.set(this.labels() || []);
    }

    openCreate() {
        this.creating = true;
    }

    cancelCreate() {
        this.creating = false;
        this.editingLabel = null;
    }

    onLabelSaved(label: Label) {
        const labels = this.labels() || [];
        const existingIndex = labels.findIndex(l => l.id === label.id);
        if (existingIndex && existingIndex >= 0) {
            // Update existing
            labels[existingIndex] = label;
        } else {
            // Add new
            labels.push(label);
        }
        this.labelService.set(labels);
        this.creating = false;
        this.editingLabel = null;
    }

    editLabel(label: Label) {
        this.editingLabel = label;
        this.creating = false;
    }

    deleteLabel(label: Label) {
        if (!window.confirm(`Delete label "${label.name}"?`)) return;
        const labels = this.labels() || [];
        this.labelService.set(labels.filter(l => l.id !== label.id));
    }

    // File input change handler - called from template
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;
        const file = input.files[0];
        // clear the input so the same file can be re-selected later
        input.value = '';
        this.importLabelsFromFile(file);
    }

    private importLabelsFromFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = reader.result as string;
                const parsed = JSON.parse(raw);

                if (!Array.isArray(parsed)) {
                    throw new Error('Imported JSON must be an array of labels');
                }

                // Basic validation: ensure each item has id and name
                const ok = parsed.every((p: any) => p && typeof p.id === 'string' && typeof p.name === 'string');
                if (!ok) {
                    throw new Error('Each label must have at least an "id" (string) and "name" (string)');
                }

                const proceed = window.confirm(
                    'Replace current labels with imported labels? This will overwrite your existing labels.'
                );
                if (!proceed) return;

                // Cast to Label[]; we intentionally trust the imported structure beyond the basic checks
                this.labelService.set(parsed as Label[]);
                window.alert('Labels imported successfully');
            } catch (err: any) {
                window.alert('Failed to import labels: ' + (err && err.message ? err.message : String(err)));
            }
        };

        reader.onerror = () => {
            window.alert('Failed to read file');
        };

        reader.readAsText(file);
    }

    // Export current labels as a JSON file (timestamped)
    exportLabels() {
        try {
            const data = JSON.stringify(this.labels, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            a.href = url;
            a.download = `labels-${yyyy}${mm}${dd}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            window.alert('Failed to export labels: ' + (err && err.message ? err.message : String(err)));
        }
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
