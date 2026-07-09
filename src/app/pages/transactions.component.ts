import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../services/analytics';
import { ParseService } from '../../services/parse.service';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../types/transaction.type';

@Component({
    selector: 'app-transactions',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './transactions.component.html',
})
export class TransactionsComponent {
    files: File[] = [];
    statusMessage = '';
    includeDuplicates = false;
    private readonly transactionService = inject(TransactionService);
    private readonly parseService = inject(ParseService);
    private readonly analytics = inject(AnalyticsService);
    readonly coverage = this.transactionService.coverageStats;
    readonly minDate = this.transactionService.minDate;
    readonly maxDate = this.transactionService.maxDate;
    readonly hasTransactions = computed(() => this.coverage().total > 0);

    onFilesSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) {
            this.files = [];
            this.analytics.track('Import Files Cleared');
            return;
        }

        const selectedCount = input.files.length;
        this.files = Array.from(input.files).filter(f => f.name.toLowerCase().endsWith('.tab'));
        const ignoredCount = selectedCount - this.files.length;
        this.statusMessage = this.files.length
            ? `${this.files.length} .TAB file(s) selected`
            : 'No .TAB files selected (others were ignored)';

        this.analytics.track('Import Files Selected', {
            selectedCount,
            acceptedTabCount: this.files.length,
            ignoredCount,
        });
    }

    onIncludeDuplicatesChange() {
        this.analytics.track('Import Duplicate Setting Changed', {
            includeDuplicates: this.includeDuplicates,
        });
    }

    async processFiles() {
        if (!this.files.length) {
            this.statusMessage = 'No .TAB files to process';
            this.analytics.track('Import Attempted Without Files');
            return;
        }

        this.analytics.track('Import Processing Started', {
            fileCount: this.files.length,
            includeDuplicates: this.includeDuplicates,
        });

        try {
            // Read all files as text in the selected order and join into a single string
            const texts = await Promise.all(this.files.map(f => f.text()));
            const combined = texts.map(t => t.trim()).join('\n');

            // Parse combined .TAB content into Transaction[]
            const transactions: Transaction[] = this.parseService.parseTabFile(combined);

            // Save parsed transactions via TransactionService
            const result = this.transactionService.set(transactions, { includeDuplicates: this.includeDuplicates });

            this.statusMessage = result.skippedDuplicates
                ? `Parsed ${result.total} transaction(s), saved ${result.stored} unique transaction(s), skipped ${result.skippedDuplicates} duplicate(s)`
                : `Parsed and saved ${result.stored} transaction(s) to storage (key: uploaded_tabs_transactions)`;

            this.analytics.track('Import Processing Succeeded', {
                fileCount: this.files.length,
                parsedTotal: result.total,
                storedTotal: result.stored,
                skippedDuplicates: result.skippedDuplicates,
                includeDuplicates: result.includeDuplicates,
            });
        } catch (err) {
            console.error(err);
            this.statusMessage = 'Error processing files - see console for details';
            this.analytics.track('Import Processing Failed', {
                fileCount: this.files.length,
                includeDuplicates: this.includeDuplicates,
            });
        }
    }
}
