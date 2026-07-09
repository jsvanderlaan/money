import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FilterService } from '../../../services/filter.service';
import { TransactionService } from '../../../services/transaction.service';
import { TransactionRowComponent } from '../transaction-row/transaction-row.component';

type SortField = 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

interface SortState {
    field: SortField;
    direction: SortDirection;
}

@Component({
    selector: 'app-transactions-table',
    standalone: true,
    imports: [CommonModule, RouterLink, TransactionRowComponent],
    templateUrl: './transactions-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsTableComponent {
    readonly transactionService = inject(TransactionService);
    private readonly filterService = inject(FilterService);
    readonly pageSize = 100;
    readonly currentPage = signal(1);

    readonly density = computed(() => this.filterService.rowDensity());
    readonly transactions = computed(() => this.transactionService.transactions());
    readonly totalTransactions = computed(() => this.transactions().length);
    readonly pageCount = computed(() => Math.max(1, Math.ceil(this.totalTransactions() / this.pageSize)));
    readonly pageStart = computed(() => (this.totalTransactions() ? (this.currentPage() - 1) * this.pageSize + 1 : 0));
    readonly pageEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.totalTransactions()));
    readonly pagedTransactions = computed(() => {
        const transactions = this.transactions();
        const page = Math.min(this.currentPage(), this.pageCount());
        const start = (page - 1) * this.pageSize;
        return transactions.slice(start, start + this.pageSize);
    });

    constructor() {
        effect(() => {
            const maxPage = this.pageCount();
            if (this.currentPage() > maxPage) {
                this.currentPage.set(maxPage);
            }
        });
    }

    prevPage(): void {
        this.currentPage.update(page => Math.max(1, page - 1));
    }

    nextPage(): void {
        this.currentPage.update(page => Math.min(this.pageCount(), page + 1));
    }

    goToPage(page: number): void {
        this.currentPage.set(Math.min(this.pageCount(), Math.max(1, page)));
    }
}
