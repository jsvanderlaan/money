import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Transaction, TransactionType } from '../../../types/transaction.type';

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

    /**
     * Return '#000' or '#fff' depending on bg color for readable contrast.
     * Accepts hex colors like #RRGGBB or #RGB, or basic color names (falls back to '#000').
     */
    textColor(bg: string | undefined): string {
        if (!bg) return '#000';
        // normalize
        let hex = bg.trim();
        if (hex.startsWith('rgb')) {
            // parse rgb( r, g, b )
            const m = hex.match(/(\d+),\s*(\d+),\s*(\d+)/);
            if (m) {
                const r = Number(m[1]) / 255;
                const g = Number(m[2]) / 255;
                const b = Number(m[3]) / 255;
                const lum = 0.2126 * this.linearize(r) + 0.7152 * this.linearize(g) + 0.0722 * this.linearize(b);
                return lum > 0.5 ? '#000' : '#fff';
            }
        }
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
            if (hex.length === 3) {
                hex = hex
                    .split('')
                    .map(c => c + c)
                    .join('');
            }
            if (hex.length === 6) {
                const r = parseInt(hex.slice(0, 2), 16) / 255;
                const g = parseInt(hex.slice(2, 4), 16) / 255;
                const b = parseInt(hex.slice(4, 6), 16) / 255;
                const lum = 0.2126 * this.linearize(r) + 0.7152 * this.linearize(g) + 0.0722 * this.linearize(b);
                return lum > 0.5 ? '#000' : '#fff';
            }
        }
        // fallback: black
        return '#000';
    }

    private linearize(c: number) {
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
}
