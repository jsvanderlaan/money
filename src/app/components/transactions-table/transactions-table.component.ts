import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
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
    imports: [CommonModule, TransactionRowComponent],
    templateUrl: './transactions-table.component.html',
})
export class TransactionsTableComponent {
    readonly transactionService = inject(TransactionService);
}
