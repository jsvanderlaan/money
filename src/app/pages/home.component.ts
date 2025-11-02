import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LabelService } from '../../services/label.service';
import { StorageService } from '../../services/storage.service';
import { Transaction } from '../../types/transaction.type';
import { TransactionsTableComponent } from '../components/transactions-table/transactions-table.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, TransactionsTableComponent],
    templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
    transactions: Transaction[] = [];
    savedAt?: string;

    private readonly storage = inject(StorageService);
    private readonly labelService = inject(LabelService);

    ngOnInit(): void {
        const payload = this.storage.loadTransactions('uploaded_tabs_transactions');
        if (payload) {
            this.transactions = payload.transactions;
            this.savedAt = payload.savedAt;

            // load persisted labels (if any) and apply them to the shown transactions
            const lblPayload = this.storage.loadLabels('labels');
            const labels = lblPayload ? lblPayload.labels : [];
            if (labels && labels.length) {
                this.labelService.applyLabels(labels, this.transactions);
            }
        }
    }
}
