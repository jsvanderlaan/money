import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../services/analytics';
import { LabelSuggestionAuditService } from '../../services/label-suggestion-audit.service';
import { LabelService } from '../../services/label.service';
import { TransactionService } from '../../services/transaction.service';
import { PatternType, UnlabeledPattern, UnlabeledPatternsService } from '../../services/unlabeled-patterns.service';
import { Label, RuleNode } from '../../types/label.type';
import { LabelCreatorComponent, LabelDraft } from '../components/label-creator';

@Component({
    selector: 'app-labels',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, LabelCreatorComponent],
    templateUrl: './labels.component.html',
})
export class LabelsComponent {
    // Creation/edit state
    creating = false;
    editingLabel: Label | null = null;
    draftFromPattern: LabelDraft | null = null;
    draftPatternSource = signal<{ type: PatternType; label: string } | null>(null);
    readonly activeTab = signal<'workspace' | 'existing' | 'discovery'>('workspace');
    readonly labelSearch = signal('');
    readonly expandedLabelImpacts = signal<Record<string, boolean>>({});
    readonly selectedOverlapLabelId = signal<string | null>(null);

    private readonly labelService = inject(LabelService);
    private readonly txService = inject(TransactionService);
    private readonly patternsService = inject(UnlabeledPatternsService);
    private readonly suggestionAudit = inject(LabelSuggestionAuditService);
    private readonly analytics = inject(AnalyticsService);
    readonly labels = this.labelService.labels;
    readonly filteredLabels = computed(() => {
        const query = this.labelSearch().trim().toLowerCase();
        const labels = this.labels() || [];
        if (!query) return labels;
        return labels.filter(label => label.name.toLowerCase().includes(query));
    });
    readonly patterns = this.patternsService.patterns;
    readonly auditEntries = computed(() => [...this.suggestionAudit.entries()].reverse().slice(0, 10));
    readonly coverage = this.txService.coverageStats;

    readonly labelImpactMap = computed(() => {
        const all = this.txService.allLabeledTransactions();
        const impactMap = new Map<string, { count: number; sample: typeof all }>();
        for (const tx of all) {
            for (const lbl of tx.labels || []) {
                if (!impactMap.has(lbl.id)) {
                    impactMap.set(lbl.id, { count: 0, sample: [] });
                }
                const slot = impactMap.get(lbl.id)!;
                slot.count += 1;
                if (slot.sample.length < 5) {
                    slot.sample.push(tx);
                }
            }
        }
        return impactMap;
    });

    readonly labelOrderingHint = computed(() => {
        const labels = this.labels() || [];
        const hasDependency = labels.some(label => this.ruleHasLabelReference(label.rules));
        return hasDependency
            ? 'Some labels depend on other labels. Their order affects matching.'
            : 'Label order is top-to-bottom during evaluation.';
    });

    readonly selectedOverlapWarnings = computed(() => {
        const labelId = this.selectedOverlapLabelId();
        if (!labelId) return [] as Array<{ name: string; count: number }>;

        const label = (this.labels() || []).find(item => item.id === labelId);
        if (!label) return [] as Array<{ name: string; count: number }>;

        const labels = this.labels() || [];
        const txs = this.txService.sourceTransactions();
        const currentMatches = this.labelService.getMatchingTransactions(label, txs, labels);
        const currentSet = new Set(currentMatches);

        return labels
            .filter(other => other.id !== label.id)
            .map(other => ({
                name: other.name,
                count: this.labelService.getMatchingTransactions(other, txs, labels).filter(tx => currentSet.has(tx)).length,
            }))
            .filter(item => item.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
    });

    setActiveTab(tab: 'workspace' | 'existing' | 'discovery') {
        this.activeTab.set(tab);
    }

    isActiveTab(tab: 'workspace' | 'existing' | 'discovery') {
        return this.activeTab() === tab;
    }

    tabCount(tab: 'workspace' | 'existing' | 'discovery'): number {
        if (tab === 'workspace') {
            return this.creating || this.editingLabel ? 1 : 0;
        }

        if (tab === 'existing') {
            return (this.filteredLabels() || []).length;
        }

        return this.patterns().length + this.auditEntries().length;
    }

    toggleEnabled(label: Label) {
        const labels = (this.labels() || []).map(l => (l.id === label.id ? { ...l, enabled: !l.enabled } : l));
        this.labelService.set(labels);
    }

    moveLabel(labelId: string, delta: number) {
        const labels = [...(this.labels() || [])];
        const index = labels.findIndex(label => label.id === labelId);
        const target = index + delta;
        if (index < 0 || target < 0 || target >= labels.length) return;

        const [item] = labels.splice(index, 1);
        labels.splice(target, 0, item);
        this.labelService.set(labels);
    }

    openCreate() {
        this.draftFromPattern = null;
        this.draftPatternSource.set(null);
        this.creating = true;
        this.editingLabel = null;
        this.activeTab.set('workspace');

        this.analytics.track('Label Create Started', {
            source: 'manual',
            existingLabels: (this.labels() || []).length,
        });
    }

    cancelCreate() {
        this.creating = false;
        this.editingLabel = null;
        this.draftFromPattern = null;
        this.draftPatternSource.set(null);
    }

    onLabelSaved(label: Label) {
        const labels = [...(this.labels() || [])];
        const existingIndex = labels.findIndex(l => l.id === label.id);
        const mode = existingIndex >= 0 ? 'edit' : 'create';
        if (existingIndex >= 0) {
            // Update existing
            labels[existingIndex] = { ...label };
        } else {
            // Add new
            labels.push({ ...label });
        }
        this.labelService.set(labels);

        this.analytics.track('Label Saved', {
            mode,
            source: this.draftPatternSource() ? 'discovery' : 'manual',
            labelCount: labels.length,
            hasLabelDependency: this.ruleHasLabelReference(label.rules),
        });

        const source = this.draftPatternSource();
        if (source) {
            this.suggestionAudit.record({
                timestamp: new Date().toISOString(),
                sourceType: source.type,
                sourceLabel: source.label,
                suggestedName: label.name,
                action: 'saved',
            });
        }

        this.creating = false;
        this.editingLabel = null;
        this.draftFromPattern = null;
        this.draftPatternSource.set(null);
        this.activeTab.set('existing');
    }

    editLabel(label: Label) {
        this.editingLabel = label;
        this.creating = false;
        this.draftFromPattern = null;
        this.draftPatternSource.set(null);
        this.activeTab.set('workspace');

        this.analytics.track('Label Edit Started', {
            labelId: label.id,
            labelEnabled: label.enabled,
        });
    }

    createLabelFromPattern(pattern: UnlabeledPattern) {
        this.creating = true;
        this.editingLabel = null;
        this.draftFromPattern = {
            name: pattern.suggestedName,
            color: this.randomColor(),
            rules: pattern.suggestedRule,
        };
        this.draftPatternSource.set({ type: pattern.type, label: pattern.label });

        this.suggestionAudit.record({
            timestamp: new Date().toISOString(),
            sourceType: pattern.type,
            sourceLabel: pattern.label,
            suggestedName: pattern.suggestedName,
            action: 'draft-created',
        });

        this.analytics.track('Label Discovery Draft Created', {
            patternType: pattern.type,
            patternCount: pattern.count,
            coverageDeltaEstimate: pattern.coverageDeltaEstimate,
        });

        this.activeTab.set('workspace');
    }

    toggleImpact(labelId: string) {
        const current = { ...this.expandedLabelImpacts() };
        current[labelId] = !current[labelId];
        this.expandedLabelImpacts.set(current);
    }

    isImpactExpanded(labelId: string) {
        return !!this.expandedLabelImpacts()[labelId];
    }

    impactCount(labelId: string): number {
        return this.labelImpactMap().get(labelId)?.count || 0;
    }

    impactSample(labelId: string) {
        return this.labelImpactMap().get(labelId)?.sample || [];
    }

    confidenceText(pattern: UnlabeledPattern): string {
        if (pattern.count >= 10) return 'High';
        if (pattern.count >= 5) return 'Medium';
        return 'Low';
    }

    toggleOverlap(labelId: string) {
        this.selectedOverlapLabelId.set(this.selectedOverlapLabelId() === labelId ? null : labelId);
    }

    isOverlapExpanded(labelId: string) {
        return this.selectedOverlapLabelId() === labelId;
    }

    ruleHasLabelReference(node: RuleNode | null | undefined): boolean {
        if (!node) return false;
        if (node.kind === 'hasLabel') return true;
        if (node.kind === 'group') return node.children.some(child => this.ruleHasLabelReference(child));
        return false;
    }

    labelSummary(label: Label): string {
        const warnings = this.selectedOverlapWarnings();
        if (!warnings.length) return 'No overlap detected';
        return warnings.map(item => `${item.name} (${item.count})`).join(', ');
    }

    deleteLabel(label: Label) {
        if (!window.confirm(`Delete label "${label.name}"?`)) return;
        const labels = this.labels() || [];
        this.labelService.set(labels.filter(l => l.id !== label.id));

        this.analytics.track('Label Deleted', {
            labelId: label.id,
            remainingLabels: Math.max(0, labels.length - 1),
        });
    }

    clearLabelSearch() {
        this.labelSearch.set('');
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
        this.analytics.track('Label Import Started', {
            fileSizeBytes: file.size,
        });

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = reader.result as string;
                const parsed = JSON.parse(raw);

                const validation = this.validateImportedLabels(parsed);
                if (!validation.ok) {
                    throw new Error(validation.errors.join(' '));
                }

                const proceed = window.confirm(
                    'Replace current labels with imported labels? This will overwrite your existing labels.'
                );
                if (!proceed) {
                    this.analytics.track('Label Import Cancelled');
                    return;
                }

                this.labelService.set(validation.labels);
                this.analytics.track('Label Import Succeeded', {
                    importedCount: validation.labels.length,
                });
                window.alert('Labels imported successfully');
            } catch (err: any) {
                this.analytics.track('Label Import Failed');
                window.alert('Failed to import labels: ' + (err && err.message ? err.message : String(err)));
            }
        };

        reader.onerror = () => {
            this.analytics.track('Label Import Failed');
            window.alert('Failed to read file');
        };

        reader.readAsText(file);
    }

    private validateImportedLabels(raw: unknown): { ok: boolean; errors: string[]; labels: Label[] } {
        const errors: string[] = [];
        if (!Array.isArray(raw)) {
            return { ok: false, errors: ['Imported JSON must be an array of labels.'], labels: [] };
        }

        const labels: Label[] = [];
        raw.forEach((item: any, index) => {
            const path = `Label ${index + 1}`;
            if (!item || typeof item !== 'object') {
                errors.push(`${path} must be an object.`);
                return;
            }

            if (typeof item.id !== 'string' || !item.id.trim()) errors.push(`${path} is missing a valid id.`);
            if (typeof item.name !== 'string' || !item.name.trim()) errors.push(`${path} is missing a valid name.`);
            if (typeof item.color !== 'string' || !item.color.trim()) errors.push(`${path} is missing a valid color.`);
            if (typeof item.enabled !== 'boolean') errors.push(`${path} is missing a valid enabled flag.`);
            if (!this.validateRuleNode(item.rules, `${path}.rules`)) errors.push(`${path} has invalid rules.`);

            labels.push({
                id: String(item.id || '').trim(),
                name: String(item.name || '').trim(),
                color: String(item.color || '#3B82F6').trim(),
                enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
                rules: item.rules,
            });
        });

        return { ok: errors.length === 0, errors, labels };
    }

    private validateRuleNode(node: any, path: string): boolean {
        if (!node || typeof node !== 'object') return false;

        if (node.kind === 'condition') {
            const allowedFields = ['description', 'merchant', 'naam', 'type', 'amount', 'date', 'countryCode'];
            const allowedOperators = ['is', 'includes', 'startsWith', 'endsWith', 'regex', 'gt', 'lt', 'between'];
            if (
                !allowedFields.includes(node.field) ||
                !allowedOperators.includes(node.operator) ||
                typeof node.value !== 'string'
            ) {
                return false;
            }
            if (node.field === 'date' && node.operator === 'between') {
                return typeof node.valueTo === 'string' && !!node.valueTo.trim();
            }
            return true;
        }

        if (node.kind === 'hasLabel') {
            return typeof node.labelId === 'string' && node.labelId.trim().length > 0;
        }

        if (node.kind === 'group') {
            if (node.operator !== 'and' && node.operator !== 'or') return false;
            if (!Array.isArray(node.children) || node.children.length === 0) return false;
            return node.children.every((child: any, index: number) => this.validateRuleNode(child, `${path}.children[${index}]`));
        }

        return false;
    }

    private randomColor(): string {
        const palette = ['#0EA5E9', '#14B8A6', '#22C55E', '#F59E0B', '#F97316', '#8B5CF6', '#EC4899', '#EF4444'];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    // Export current labels as a JSON file (timestamped)
    exportLabels() {
        try {
            const labelCount = (this.labels() || []).length;
            const data = JSON.stringify(this.labels() || [], null, 2);
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

            this.analytics.track('Label Export Succeeded', {
                exportedCount: labelCount,
            });
        } catch (err: any) {
            this.analytics.track('Label Export Failed');
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
