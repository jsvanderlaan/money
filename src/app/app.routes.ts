import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { LabelsComponent } from './pages/labels.component';
import { TransactionsComponent } from './pages/transactions.component';

export const routes: Routes = [
    { path: '', title: 'Home', component: HomeComponent },
    { path: 'labels', title: 'Labels', component: LabelsComponent },
    { path: 'transactions', title: 'Transactions', component: TransactionsComponent },
];
