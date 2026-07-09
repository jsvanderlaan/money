import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home.component';
import { LabelsComponent } from './pages/labels.component';
import { TransactionsComponent } from './pages/transactions.component';

export const routes: Routes = [
    {
        path: '',
        title: 'Home | money.jurre.dev',
        data: {
            description:
                'Review transaction coverage, inspect spend trends, and manage local-first personal finance workflows in one dashboard.',
        },
        component: HomeComponent,
    },
    {
        path: 'labels',
        title: 'Labels | money.jurre.dev',
        data: {
            description:
                'Create and refine labeling rules, inspect overlap, and turn recurring unlabeled patterns into reusable transaction labels.',
        },
        component: LabelsComponent,
    },
    {
        path: 'transactions',
        title: 'Transactions | money.jurre.dev',
        data: {
            description:
                'Upload bank .TAB exports, validate import quality, and manage your local transaction dataset with duplicate handling controls.',
        },
        component: TransactionsComponent,
    },
];
