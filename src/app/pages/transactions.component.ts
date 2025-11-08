import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ParseService } from '../../services/parse.service';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../types/transaction.type';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './transactions.component.html',
})
export class TransactionsComponent {
    files: File[] = [];
    statusMessage = '';
    private readonly transactionService = inject(TransactionService);
    private readonly parseService = inject(ParseService);

    onFilesSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) {
            this.files = [];
            return;
        }
        this.files = Array.from(input.files).filter(f => f.name.toLowerCase().endsWith('.tab'));
        this.statusMessage = this.files.length
            ? `${this.files.length} .TAB file(s) selected`
            : 'No .TAB files selected (others were ignored)';
    }

    async processFiles() {
        if (!this.files.length) {
            this.statusMessage = 'No .TAB files to process';
            return;
        }

        try {
            // Read all files as text in the selected order and join into a single string
            const texts = await Promise.all(this.files.map(f => f.text()));
            const combined = texts.map(t => t.trim()).join('\n');

            // Parse combined .TAB content into Transaction[]
            const transactions: Transaction[] = this.parseService.parseTabFile(combined);

            // Save parsed transactions via TransactionService
            this.transactionService.set(transactions);

            this.statusMessage = `Parsed and saved ${transactions.length} transaction(s) to storage (key: uploaded_tabs_transactions)`;
        } catch (err) {
            console.error(err);
            this.statusMessage = 'Error processing files - see console for details';
        }
    }
}
