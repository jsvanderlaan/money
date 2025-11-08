import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { InsightsComponent } from '../components/insights/insights.component';
import { TransactionsFilterComponent } from '../components/transactions-filter/transactions-filter.component';
import { TransactionsTableComponent } from '../components/transactions-table/transactions-table.component';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [CommonModule, TransactionsTableComponent, TransactionsFilterComponent, InsightsComponent],
    templateUrl: './home.component.html',
})
export class HomeComponent {}
