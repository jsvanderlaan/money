import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../services/analytics';
import { TransactionService } from '../../services/transaction.service';
import { InsightsComponent } from '../components/insights/insights.component';
import { TransactionsFilterComponent } from '../components/transactions-filter/transactions-filter.component';
import { TransactionsTableComponent } from '../components/transactions-table/transactions-table.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, RouterLink, TransactionsFilterComponent, InsightsComponent, TransactionsTableComponent],
    templateUrl: './home.component.html',
})
export class HomeComponent {
    private readonly tx = inject(TransactionService);
    private readonly analytics = inject(AnalyticsService);

    readonly coverage = this.tx.coverageStats;
    readonly minDate = this.tx.minDate;
    readonly maxDate = this.tx.maxDate;
    readonly hasTransactions = computed(() => this.coverage().total > 0);

    onStartImportClick() {
        this.analytics.track('Onboarding Start Import Clicked', {
            source: 'home_get_started',
            hasTransactions: this.hasTransactions(),
            totalTransactions: this.coverage().total,
        });
    }
}
