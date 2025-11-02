import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { FilterService } from '../../../services/filter.service';
import { Transaction } from '../../../types/transaction.type';
import { TransactionRowComponent } from '../transaction-row/transaction-row.component';
import { TransactionsFilterComponent } from '../transactions-filter/transactions-filter.component';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface SortState {
    field: SortField;
    direction: SortDirection;
}

@Component({
    selector: 'app-transactions-table',
    standalone: true,
    imports: [CommonModule, TransactionRowComponent, TransactionsFilterComponent],
    templateUrl: './transactions-table.component.html',
})
export class TransactionsTableComponent {
    readonly transactions = input.required<Transaction[]>();
    private readonly filterService = inject(FilterService);

    // Computed transactions applying sort and filter
    filteredAndSortedTransactions = computed(() => {
        let result = [...this.transactions()];

        // Apply description filter from FilterService
        const filterValues = this.filterService.descriptionWords();
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

        // Apply date range filter
        const from = this.filterService.dateFrom();
        const to = this.filterService.dateTo();
        if (from) result = result.filter(t => t.date >= from);
        if (to) result = result.filter(t => t.date <= to);

        // Apply label filter
        const labelIds = this.filterService.selectedLabelIds();
        if (labelIds && labelIds.length) {
            result = result.filter(t => (t.labels || []).some(l => labelIds.includes(l.id)));
        }

        // Apply sorting
        const { field, direction } = this.filterService.sort();
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
}
