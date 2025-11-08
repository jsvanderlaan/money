import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilterService, Granularity } from '../../../services/filter.service';
import { LabelService } from '../../../services/label.service';

@Component({
    selector: 'app-transactions-filter',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './transactions-filter.component.html',
})
export class TransactionsFilterComponent {
    private readonly filter = inject(FilterService);
    private readonly labelService = inject(LabelService);
    readonly labels = computed(() => [...(this.labelService.labels() || [])].sort((a, b) => a.name.localeCompare(b.name)));

    get description() {
        return this.filter.description();
    }
    set description(v: string) {
        this.filter.setDescription(v);
    }

    get dateFrom() {
        const d = this.filter.dateFrom();
        return d ? d.toISOString().slice(0, 10) : '';
    }
    set dateFrom(v: string) {
        this.filter.setDateRange(v ? new Date(v) : null, this.filter.dateTo());
    }

    get dateTo() {
        const d = this.filter.dateTo();
        return d ? d.toISOString().slice(0, 10) : '';
    }
    set dateTo(v: string) {
        this.filter.setDateRange(this.filter.dateFrom(), v ? new Date(v) : null);
    }

    get selectedLabelIds() {
        return this.filter.selectedLabelIds();
    }

    toggleLabel(id: string) {
        const cur = new Set(this.filter.selectedLabelIds());
        if (cur.has(id)) cur.delete(id);
        else cur.add(id);
        this.filter.setSelectedLabels(Array.from(cur));
    }

    clearFilters() {
        this.filter.setDescription('');
        this.filter.setDateRange(null, null);
        this.filter.setSelectedLabels([]);
    }

    get granularity() {
        return this.filter.granularity();
    }
    set granularity(v: Granularity) {
        this.filter.setGranularity(v);
    }

    // Sorting helpers (delegate to FilterService)
    setSort(field: 'date' | 'amount') {
        this.filter.setSort(field);
    }

    getSortIcon(field: 'date' | 'amount') {
        const s = this.filter.sort();
        if (s.field !== field) return '';
        return s.direction === 'asc' ? '↑' : '↓';
    }
}
