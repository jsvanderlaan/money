import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { Transaction } from '../../types/transaction.type';
import { TransactionRowComponent } from './transaction-row.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, TransactionRowComponent],
    templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
    transactions: Transaction[] = [];
    savedAt?: string;

    private readonly storage = inject(StorageService);

    ngOnInit(): void {
        const payload = this.storage.loadTransactions('uploaded_tabs_transactions');
        if (payload) {
            this.transactions = payload.transactions.splice(0, 5);
            this.savedAt = payload.savedAt;
        }
    }
}
