import { computed, effect, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface SortState {
    field: SortField;
    direction: SortDirection;
}

interface PersistedFilter {
    description: string;
    dateFrom?: string | null;
    dateTo?: string | null;
    labels: string[];
    sort: SortState;
}

@Injectable({ providedIn: 'root' })
export class FilterService {
    private readonly storageKey = 'tx_filters';

    // filter state as signals
    description = signal<string>('');
    dateFrom = signal<Date | null>(null);
    dateTo = signal<Date | null>(null);
    selectedLabelIds = signal<string[]>([]);

    sort = signal<SortState>({ field: 'date', direction: 'desc' });

    // computed for convenience
    descriptionWords = computed(() =>
        this.description()
            .split(' ')
            .map(w => w.trim().toLowerCase())
            .filter(Boolean)
    );

    constructor(private storage: StorageService) {
        // load persisted
        const v = this.storage.getObject<PersistedFilter>(this.storageKey);
        if (v) {
            this.description.set(v.description || '');
            this.dateFrom.set(v.dateFrom ? new Date(v.dateFrom) : null);
            this.dateTo.set(v.dateTo ? new Date(v.dateTo) : null);
            this.selectedLabelIds.set(v.labels || []);
            this.sort.set(v.sort || { field: 'date', direction: 'desc' });
        } else {
            // default to last month period
            const today = new Date();
            const prior = new Date();
            prior.setMonth(prior.getMonth() - 1);
            this.dateFrom.set(prior);
            this.dateTo.set(today);
        }

        // persist on changes
        effect(() => {
            const payload: PersistedFilter = {
                description: this.description(),
                dateFrom: this.dateFrom()?.toISOString() ?? null,
                dateTo: this.dateTo()?.toISOString() ?? null,
                labels: this.selectedLabelIds(),
                sort: this.sort(),
            };
            this.storage.setObject(this.storageKey, payload);
        });
    }

    setDescription(v: string) {
        this.description.set(v ?? '');
    }

    setDateRange(from: Date | null, to: Date | null) {
        this.dateFrom.set(from);
        this.dateTo.set(to);
    }

    setSelectedLabels(ids: string[]) {
        this.selectedLabelIds.set(ids || []);
    }

    setSort(field: SortField) {
        const current = this.sort();
        if (current.field === field) {
            this.sort.set({ field, direction: current.direction === 'asc' ? 'desc' : 'asc' });
        } else {
            this.sort.set({ field, direction: 'desc' });
        }
    }
}
