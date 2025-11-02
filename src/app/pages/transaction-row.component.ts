import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Transaction, TransactionType } from '../../types/transaction.type';

@Component({
    selector: 'app-transaction-row',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './transaction-row.component.html',
})
export class TransactionRowComponent {
    @Input() transaction!: Transaction;
    TransactionType = TransactionType; // expose enum to template

    formatDate(d?: Date) {
        if (!d) return '';
        return d.toISOString().slice(0, 10);
    }
    // UI state
    expanded = false;

    toggle() {
        this.expanded = !this.expanded;
    }

    get primaryLabel(): string {
        // For payment card / merchant related transactions, merchant is most relevant
        if (
            this.transaction.type === TransactionType.Betaalpas ||
            this.transaction.type === TransactionType.GarminPay ||
            this.transaction.type === TransactionType.BetaalpasTerugboeking
        ) {
            return this.transaction.merchant || this.transaction.description || '';
        }

        // For transfers/incasso show 'naam' if present
        if (
            this.transaction.type === TransactionType.Overboeking ||
            this.transaction.type === TransactionType.iDEAL ||
            this.transaction.type === TransactionType.PeriodiekeOverboeking ||
            this.transaction.type === TransactionType.IncassoAlgemeenDoorlopend
        ) {
            return this.transaction.naam || this.transaction.merchant || this.transaction.description || '';
        }

        // fallback
        return this.transaction.merchant || this.transaction.naam || this.transaction.description || '';
    }

    amountClass(): string {
        return this.transaction.amount < 0 ? 'text-red-600' : 'text-green-600';
    }
}
