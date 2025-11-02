import { CommonModule } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Transaction } from '../../../types/transaction.type';
import { TransactionRowComponent } from '../transaction-row/transaction-row.component';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface SortState {
    field: SortField;
    direction: SortDirection;
}

interface FilterForm {
    description: FormControl<string>;
}

@Component({
    selector: 'app-transactions-table',
    standalone: true,
    imports: [CommonModule, TransactionRowComponent, ReactiveFormsModule],
    templateUrl: './transactions-table.component.html',
})
export class TransactionsTableComponent {
    readonly transactions = input.required<Transaction[]>();
    readonly filterValues = signal<string[]>([]);

    // Sorting
    private readonly sortState = signal<SortState>({ field: 'date', direction: 'desc' });

    readonly form = new FormGroup<FilterForm>({
        description: new FormControl('', { nonNullable: true }),
    });

    constructor() {
        this.form.valueChanges.subscribe(value =>
            this.filterValues.set(
                value.description
                    ?.split(' ')
                    .map(word => word.trim().toLocaleLowerCase())
                    .filter(Boolean) || []
            )
        );
    }

    // Computed transactions applying sort and filter
    filteredAndSortedTransactions = computed(() => {
        let result = [...this.transactions()];

        // Apply description filter
        const filterValues = this.filterValues();
        if (filterValues.length > 0) {
            result = result.filter(t =>
                filterValues.every(
                    filterValue =>
                        t.description.toLowerCase().includes(filterValue) ||
                        t.merchant?.toLowerCase().includes(filterValue) ||
                        t.naam?.toLowerCase().includes(filterValue)
                )
            );
        }

        // Apply sorting
        const { field, direction } = this.sortState();
        result.sort((a, b) => {
            const modifier = direction === 'asc' ? 1 : -1;

            if (field === 'date') {
                return (a.date.getTime() - b.date.getTime()) * modifier;
            }

            if (field === 'amount') {
                return (a.amount - b.amount) * modifier;
            }

            return 0;
        });

        return result;
    });

    sort(field: SortField) {
        const currentSort = this.sortState();

        if (currentSort.field === field) {
            // Toggle direction if clicking same field
            this.sortState.set({
                field,
                direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
            });
        } else {
            // New field, start with desc
            this.sortState.set({ field, direction: 'desc' });
        }
    }

    getSortIcon(field: SortField): string {
        const { field: currentField, direction } = this.sortState();

        if (field !== currentField) return '';
        return direction === 'asc' ? '↑' : '↓';
    }
}
