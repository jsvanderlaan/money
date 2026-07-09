import { Injectable, Signal, computed, inject } from '@angular/core';
import { Transaction } from '../types/transaction.type';
import { ChartMode, FilterService } from './filter.service';
import { TransactionService } from './transaction.service';

interface DateGroup {
    key: string;
    timestamp: number;
    start: Date;
    end: Date;
    transactions: Transaction[];
}

interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string;
    fill?: boolean;
    stack?: string;
    tension?: number;
    pointRadius?: number;
}

export interface PeriodTrend {
    percentage: number | null;
    absolute: number | null;
    direction: 'up' | 'down' | 'flat' | 'n/a';
}

export interface InsightsMetrics {
    averageAmount: number;
    medianAmount: number;
    totalIncome: number;
    totalExpenses: number;
    maxAmount: number | null;
    minAmount: number | null;
    averagePerPeriod: number;
    trend: PeriodTrend;
}

export interface AggregatedData {
    labels: string[];
    datasets: ChartDataset[];
    periods: Array<{ label: string; start: Date; end: Date }>;
    mode: ChartMode;
    metrics: InsightsMetrics;
}

@Injectable({
    providedIn: 'root',
})
export class InsightsService {
    private readonly transactionService = inject(TransactionService);
    private readonly filterService = inject(FilterService);
    private lastAggregationKey = '';
    private lastAggregationResult: AggregatedData | null = null;
    private readonly rangeCache = new Map<
        'day' | 'week' | 'month' | 'year',
        Map<number, { key: string; timestamp: number; start: Date; end: Date }>
    >();
    private readonly dayFormatter = new Intl.DateTimeFormat('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    private readonly monthFormatter = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
    });
    private readonly emptyMetrics: InsightsMetrics = {
        averageAmount: 0,
        medianAmount: 0,
        totalIncome: 0,
        totalExpenses: 0,
        maxAmount: null,
        minAmount: null,
        averagePerPeriod: 0,
        trend: {
            percentage: null,
            absolute: null,
            direction: 'n/a',
        },
    };

    readonly aggregatedData: Signal<AggregatedData> = computed(() => {
        const transactions = this.transactionService.transactions();
        const granularity = this.filterService.granularity();
        const chartMode = this.filterService.chartMode();

        return this.aggregateTransactions(transactions, granularity, chartMode);
    });

    private aggregateTransactions(
        transactions: Transaction[],
        granularity: 'day' | 'week' | 'month' | 'year',
        chartMode: ChartMode
    ): AggregatedData {
        const cacheKey = this.buildAggregationKey(transactions, granularity, chartMode);
        if (this.lastAggregationResult && this.lastAggregationKey === cacheKey) {
            return this.lastAggregationResult;
        }

        const groups = new Map<string, DateGroup>();

        if (transactions.length === 0) {
            const emptyResult = {
                labels: [],
                datasets: [],
                periods: [],
                mode: chartMode,
                metrics: this.emptyMetrics,
            };
            this.lastAggregationKey = cacheKey;
            this.lastAggregationResult = emptyResult;
            return emptyResult;
        }

        // Find min and max dates
        const minTime = Math.min(...transactions.map(tx => tx.date.getTime()));
        const maxTime = Math.max(...transactions.map(tx => tx.date.getTime()));
        const minDate = new Date(minTime);
        const maxDate = new Date(maxTime);

        // Generate all periods between min and max
        const current = new Date(minDate);
        while (current <= maxDate) {
            const { key, timestamp, start, end } = this.getGroupRange(current, granularity);
            if (!groups.has(key)) {
                groups.set(key, { key, timestamp, start, end, transactions: [] });
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
        const { key, timestamp, start, end } = this.getGroupRange(maxDate, granularity);
        if (!groups.has(key)) {
            groups.set(key, { key, timestamp, start, end, transactions: [] });
        }

        // Add transaction amounts to their periods
        for (const tx of transactions) {
            const { key } = this.getGroupRange(tx.date, granularity);
            if (!groups.has(key)) {
                console.warn(`Group key not found for transaction date: ${tx.date.toISOString()}`);
                continue;
            }
            groups.get(key)!.transactions.push(tx);
        }

        // Sort by timestamp (chronological order)
        const sortedGroups = Array.from(groups.values()).sort((a, b) => a.timestamp - b.timestamp);
        const periods = sortedGroups.map(g => ({ label: g.key, start: g.start, end: g.end }));
        const periodTotals = sortedGroups.map(group => group.transactions.reduce((sum, tx) => sum + tx.amount, 0));
        const metrics = this.buildMetrics(transactions, periodTotals);

        if (chartMode === 'cumulative') {
            let runningTotal = 0;
            const cumulativeData = periodTotals.map(value => {
                runningTotal += value;
                return runningTotal;
            });

            const cumulativeResult = {
                labels: sortedGroups.map(g => g.key),
                datasets: [
                    {
                        label: 'Cumulative Net Amount',
                        data: cumulativeData,
                        backgroundColor: 'rgba(59, 130, 246, 0.14)',
                        borderColor: 'rgb(59, 130, 246)',
                        fill: true,
                        tension: 0.28,
                        pointRadius: 3,
                    },
                ],
                periods,
                mode: chartMode,
                metrics,
            };
            this.lastAggregationKey = cacheKey;
            this.lastAggregationResult = cumulativeResult;
            return cumulativeResult;
        }

        if (chartMode === 'stacked') {
            const stacked = this.buildStackedDatasets(sortedGroups);
            const stackedResult = {
                labels: sortedGroups.map(g => g.key),
                datasets: stacked.datasets,
                periods,
                mode: chartMode,
                metrics,
            };
            this.lastAggregationKey = cacheKey;
            this.lastAggregationResult = stackedResult;
            return stackedResult;
        }

        const result = {
            labels: sortedGroups.map(g => g.key),
            datasets: [
                {
                    label: 'Net Amount',
                    data: periodTotals,
                    backgroundColor: 'rgb(59, 130, 246)',
                    borderColor: 'rgb(59, 130, 246)',
                    fill: chartMode === 'line',
                },
            ],
            periods,
            mode: chartMode,
            metrics,
        };

        this.lastAggregationKey = cacheKey;
        this.lastAggregationResult = result;
        return result;
    }

    private buildAggregationKey(
        transactions: Transaction[],
        granularity: 'day' | 'week' | 'month' | 'year',
        chartMode: ChartMode
    ): string {
        const transactionSignature = transactions
            .map(tx => `${tx.date.getTime()}:${tx.amount}:${tx.labels?.[0]?.name || ''}`)
            .join('|');

        return [granularity, chartMode, transactions.length, transactionSignature].join('::');
    }

    private buildStackedDatasets(groups: DateGroup[]): { datasets: ChartDataset[] } {
        const topLabels = new Map<string, { total: number; color: string }>();

        for (const group of groups) {
            for (const tx of group.transactions) {
                const applied = tx.labels?.[0]?.name || 'Unlabeled';
                const current = topLabels.get(applied) || { total: 0, color: this.colorForLabel(applied) };
                current.total += Math.abs(tx.amount);
                topLabels.set(applied, current);
            }
        }

        const selectedLabels = Array.from(topLabels.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 4)
            .map(([name, meta]) => ({ name, color: meta.color }));

        const datasets = selectedLabels.map(item => ({
            label: item.name,
            data: groups.map(group =>
                group.transactions
                    .filter(tx => (tx.labels?.[0]?.name || 'Unlabeled') === item.name)
                    .reduce((sum, tx) => sum + tx.amount, 0)
            ),
            backgroundColor: item.color,
            stack: 'stack',
        }));

        return { datasets };
    }

    private buildMetrics(transactions: Transaction[], periodTotals: number[]): InsightsMetrics {
        const amounts = transactions.map(tx => tx.amount);
        const count = amounts.length;
        const sum = amounts.reduce((acc, value) => acc + value, 0);

        const totalIncome = amounts.filter(value => value > 0).reduce((acc, value) => acc + value, 0);
        const totalExpenses = amounts.filter(value => value < 0).reduce((acc, value) => acc + Math.abs(value), 0);

        const maxAmount = count > 0 ? Math.max(...amounts) : null;
        const minAmount = count > 0 ? Math.min(...amounts) : null;
        const averageAmount = count > 0 ? sum / count : 0;
        const medianAmount = this.computeMedian(amounts);
        const averagePerPeriod = periodTotals.length > 0 ? sum / periodTotals.length : 0;
        const trend = this.computeTrend(periodTotals);

        return {
            averageAmount,
            medianAmount,
            totalIncome,
            totalExpenses,
            maxAmount,
            minAmount,
            averagePerPeriod,
            trend,
        };
    }

    private computeMedian(values: number[]): number {
        if (values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }

        return sorted[mid];
    }

    private computeTrend(periodTotals: number[]): PeriodTrend {
        if (periodTotals.length < 2) {
            return { percentage: null, absolute: null, direction: 'n/a' };
        }

        const current = periodTotals[periodTotals.length - 1];
        const previous = periodTotals[periodTotals.length - 2];
        const absolute = current - previous;

        if (absolute === 0) {
            return { percentage: 0, absolute: 0, direction: 'flat' };
        }

        if (previous === 0) {
            return {
                percentage: null,
                absolute,
                direction: absolute > 0 ? 'up' : 'down',
            };
        }

        const percentage = (absolute / Math.abs(previous)) * 100;
        return {
            percentage,
            absolute,
            direction: absolute > 0 ? 'up' : 'down',
        };
    }

    private colorForLabel(label: string): string {
        const palette = ['rgb(59, 130, 246)', 'rgb(16, 185, 129)', 'rgb(245, 158, 11)', 'rgb(239, 68, 68)'];
        const hash = Array.from(label).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
        return palette[hash % palette.length];
    }

    private getGroupRange(
        date: Date,
        granularity: 'day' | 'week' | 'month' | 'year'
    ): { key: string; timestamp: number; start: Date; end: Date } {
        const cacheKey = date.getTime();
        const cached = this.rangeCacheFor(granularity).get(cacheKey);
        if (cached) return cached;

        const d = new Date(date); // Clone to avoid mutations
        let result: { key: string; timestamp: number; start: Date; end: Date };

        switch (granularity) {
            case 'day':
                d.setHours(0, 0, 0, 0);
                result = {
                    key: this.dayFormatter.format(d),
                    timestamp: d.getTime(),
                    start: new Date(d),
                    end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
                };
                break;

            case 'week': {
                // Set to monday of the week
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                d.setDate(diff);
                d.setHours(0, 0, 0, 0);
                const end = new Date(d);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);

                result = {
                    // Week [week number] [year]
                    key: `Week ${this.getWeekNumber(d, 1)} ${d.toLocaleString('en-US', { year: 'numeric' })}`,
                    timestamp: d.getTime(),
                    start: new Date(d),
                    end,
                };
                break;
            }

            case 'month':
                d.setDate(1);
                d.setHours(0, 0, 0, 0);
                result = {
                    key: this.monthFormatter.format(d),
                    timestamp: d.getTime(),
                    start: new Date(d),
                    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
                };
                break;

            case 'year':
                d.setMonth(0, 1);
                d.setHours(0, 0, 0, 0);
                result = {
                    key: d.getFullYear().toString(),
                    timestamp: d.getTime(),
                    start: new Date(d),
                    end: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999),
                };
                break;

            default:
                throw new Error(`Unsupported granularity: ${granularity}`);
        }

        this.rangeCacheFor(granularity).set(cacheKey, result);
        return result;
    }

    private rangeCacheFor(granularity: 'day' | 'week' | 'month' | 'year') {
        let cache = this.rangeCache.get(granularity);
        if (!cache) {
            cache = new Map<number, { key: string; timestamp: number; start: Date; end: Date }>();
            this.rangeCache.set(granularity, cache);
        }

        return cache;
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
