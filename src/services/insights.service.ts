import { Injectable, Signal, computed, inject } from '@angular/core';
import { Transaction } from '../types/transaction.type';
import { FilterService } from './filter.service';
import { TransactionService } from './transaction.service';

interface DateGroup {
    key: string; // Display text
    timestamp: number; // For sorting
    transactions: Transaction[]; // Transaction amounts
}

export interface AggregatedData {
    labels: string[];
    values: number[];
}

@Injectable({
    providedIn: 'root',
})
export class InsightsService {
    private readonly transactionService = inject(TransactionService);
    private readonly filterService = inject(FilterService);

    readonly aggregatedData: Signal<AggregatedData> = computed(() => {
        const transactions = this.transactionService.transactions();
        const granularity = this.filterService.granularity();

        return this.aggregateTransactions(transactions, granularity);
    });

    private aggregateTransactions(transactions: Transaction[], granularity: 'day' | 'week' | 'month' | 'year'): AggregatedData {
        // Use a Map with both display text and sort key
        const groups = new Map<string, DateGroup>();

        if (transactions.length === 0) {
            return { labels: [], values: [] };
        }

        // Find min and max dates
        const dates = transactions.map(tx => new Date(tx.date));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        // Generate all periods between min and max
        const current = new Date(minDate);
        while (current <= maxDate) {
            const { key, timestamp } = this.getGroupKey(current, granularity);
            if (!groups.has(key)) {
                groups.set(key, { key, timestamp, transactions: [] });
            }

            // Advance to next period
            switch (granularity) {
                case 'day':
                    current.setDate(current.getDate() + 1);
                    break;
                case 'week':
                    current.setDate(current.getDate() + 7);
                    break;
                case 'month':
                    current.setMonth(current.getMonth() + 1);
                    break;
                case 'year':
                    current.setFullYear(current.getFullYear() + 1);
                    break;
            }
        }

        // Ensure maxDate period is included
        const { key, timestamp } = this.getGroupKey(maxDate, granularity);
        if (!groups.has(key)) {
            groups.set(key, { key, timestamp, transactions: [] });
        }

        // Add transaction amounts to their periods
        for (const tx of transactions) {
            const date = new Date(tx.date);
            const { key } = this.getGroupKey(date, granularity);
            if (!groups.has(key)) {
                console.warn(`Group key not found for transaction date: ${date.toISOString()}`);
                continue;
            }
            groups.get(key)!.transactions.push(tx);
        }

        // Sort by timestamp (chronological order)
        const sortedGroups = Array.from(groups.values()).sort((a, b) => a.timestamp - b.timestamp);

        return {
            labels: sortedGroups.map(g => g.key),
            values: sortedGroups.map(g => g.transactions.reduce((a, b) => a + b.amount, 0)),
        };
    }

    private getGroupKey(date: Date, granularity: 'day' | 'week' | 'month' | 'year'): { key: string; timestamp: number } {
        const d = new Date(date); // Clone to avoid mutations

        switch (granularity) {
            case 'day':
                return {
                    key: d.toLocaleString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    }),
                    timestamp: d.setHours(0, 0, 0, 0),
                };

            case 'week': {
                // Set to monday of the week
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                d.setDate(diff);
                d.setHours(0, 0, 0, 0);

                return {
                    // Week [week number] [year]
                    key: `Week ${this.getWeekNumber(d, 1)} ${d.toLocaleString('en-US', { year: 'numeric' })}`,
                    timestamp: d.getTime(),
                };
            }

            case 'month':
                return {
                    key: d.toLocaleString('en-US', {
                        month: 'short',
                        year: 'numeric',
                    }),
                    timestamp: d.setDate(1),
                };

            case 'year':
                return {
                    key: d.getFullYear().toString(),
                    timestamp: d.setMonth(0, 1),
                };

            default:
                throw new Error(`Unsupported granularity: ${granularity}`);
        }
    }

    private getWeekNumber(date: Date, dowOffset: number): number {
        /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

        dowOffset = typeof dowOffset == 'number' ? dowOffset : 0; //default dowOffset to zero
        var newYear = new Date(date.getFullYear(), 0, 1);
        var day = newYear.getDay() - dowOffset; //the day of week the year begins on
        day = day >= 0 ? day : day + 7;
        var daynum =
            Math.floor(
                (date.getTime() - newYear.getTime() - (date.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000
            ) + 1;
        let weeknum = 0;
        //if the year starts before the middle of a week
        if (day < 4) {
            weeknum = Math.floor((daynum + day - 1) / 7) + 1;
            if (weeknum > 52) {
                let nYear = new Date(date.getFullYear() + 1, 0, 1);
                let nday = nYear.getDay() - dowOffset;
                nday = nday >= 0 ? nday : nday + 7;
                /*if the next year starts before the middle of
              the week, it is week #1 of that year*/
                weeknum = nday < 4 ? 1 : 53;
            }
        } else {
            weeknum = Math.floor((daynum + day - 1) / 7);
        }
        return weeknum;
    }
}
