import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { ChartMode, FilterService } from '../../../services/filter.service';
import { AggregatedData, InsightsMetrics, InsightsService } from '../../../services/insights.service';
import { TransactionService } from '../../../services/transaction.service';
import { Transaction } from '../../../types/transaction.type';

// Register all Chart.js components we'll need
Chart.register(...registerables);

@Component({
    selector: 'app-insights',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './insights.component.html',
})
export class InsightsComponent implements AfterViewInit {
    @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

    private chart: Chart | null = null;
    private readonly insights = inject(InsightsService);
    private readonly filter = inject(FilterService);
    private readonly transactionService = inject(TransactionService);
    private readonly platformId = inject(PLATFORM_ID);
    private readonly isBrowser = isPlatformBrowser(this.platformId);
    private readonly currencyFormatter = new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
    });

    readonly chartModeOptions: Array<{ value: ChartMode; label: string }> = [
        { value: 'bar', label: 'Bar' },
        { value: 'line', label: 'Line' },
        { value: 'stacked', label: 'Stacked' },
        { value: 'cumulative', label: 'Cumulative' },
    ];

    constructor() {
        effect(() => {
            if (!this.isBrowser) return;
            const data = this.insights.aggregatedData();
            if (this.chart) {
                this.updateChart(data);
            }
        });
    }

    ngAfterViewInit(): void {
        if (!this.isBrowser) return;
        this.createChart();
        const data = this.insights.aggregatedData();
        this.updateChart(data);
    }

    get chartMode() {
        return this.filter.chartMode();
    }

    set chartMode(v: ChartMode) {
        this.filter.setChartMode(v);
    }

    setGranularity(v: 'day' | 'week' | 'month' | 'year') {
        this.filter.setGranularity(v);
    }

    get metrics(): InsightsMetrics {
        return this.insights.aggregatedData().metrics;
    }

    get trendLabel(): string {
        const trend = this.metrics.trend;
        if (trend.direction === 'n/a') return 'Not enough periods yet';
        if (trend.direction === 'flat') return 'Stable versus previous period';

        const direction = trend.direction === 'up' ? 'Up' : 'Down';
        const absolute = trend.absolute === null ? '' : ` (${this.formatSignedCurrency(trend.absolute)})`;

        if (trend.percentage === null) {
            return `${direction} vs previous period${absolute}`;
        }

        return `${direction} ${Math.abs(trend.percentage).toFixed(1)}% vs previous period${absolute}`;
    }

    get trendClass(): string {
        const direction = this.metrics.trend.direction;
        if (direction === 'up') return 'text-emerald-700';
        if (direction === 'down') return 'text-rose-700';
        return 'text-slate-600';
    }

    formatCurrency(value: number | null): string {
        if (value === null) return '-';
        return this.currencyFormatter.format(value);
    }

    formatSignedCurrency(value: number | null): string {
        if (value === null) return '-';
        if (value > 0) return `+${this.currencyFormatter.format(value)}`;
        return this.currencyFormatter.format(value);
    }

    exportChartImage() {
        if (!this.isBrowser) return;
        if (!this.chart) return;
        const url = this.chart.toBase64Image();
        const a = document.createElement('a');
        a.href = url;
        a.download = `money-jurre-dev-chart-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    exportTransactionsCsv() {
        if (!this.isBrowser) return;
        const rows = this.transactionService.transactions();
        const headers = ['date', 'description', 'merchant', 'naam', 'amount', 'currency', 'labels'];
        const csv = [
            headers.join(','),
            ...rows.map((tx: Transaction) =>
                [
                    this.csvCell(tx.date.toISOString().slice(0, 10)),
                    this.csvCell(tx.description),
                    this.csvCell(tx.merchant || ''),
                    this.csvCell(tx.naam || ''),
                    this.csvCell(String(tx.amount)),
                    this.csvCell(tx.currency),
                    this.csvCell((tx.labels || []).map(l => l.name).join(' | ')),
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `money-jurre-dev-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    private createChart(): void {
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: this.resolveChartType(this.chartMode),
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Total Amount',
                        data: [],
                        backgroundColor: 'rgb(59, 130, 246)',
                        borderColor: 'rgb(59, 130, 246)',
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                onClick: (_event, activeElements) => this.handleChartClick(activeElements),
                plugins: {
                    title: {
                        display: true,
                        text: 'Net Amount Over Time',
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: this.chartMode === 'stacked',
                        ticks: {
                            callback: value => `€${value}`,
                        },
                    },
                    x: {
                        stacked: this.chartMode === 'stacked',
                    },
                },
            },
        });
    }

    private updateChart(data: AggregatedData): void {
        if (!this.chart) return;

        const chartType = this.resolveChartType(data.mode);
        if ((this.chart.config as any).type !== chartType) {
            this.chart.destroy();
            this.chart = null;
            this.createChart();
        }

        if (!this.chart) return;

        this.chart.data.labels = data.labels;
        this.chart.data.datasets = data.datasets as any;

        const scales = this.chart.options.scales as any;
        if (scales?.x) {
            scales.x.stacked = data.mode === 'stacked';
        }
        if (scales?.y) {
            scales.y.stacked = data.mode === 'stacked';
        }

        const labelId = this.filter.selectedLabelIds()[0];
        const title = labelId
            ? `Net Amount for Selected Label`
            : data.mode === 'cumulative'
              ? 'Cumulative Net Amount'
              : data.mode === 'stacked'
                ? 'Stacked Amount by Label'
                : 'Net Amount Over Time';
        this.chart.options.plugins!.title!.text = title;

        this.chart.update();
    }

    private resolveChartType(mode: ChartMode): 'bar' | 'line' {
        return mode === 'line' || mode === 'cumulative' ? 'line' : 'bar';
    }

    private handleChartClick(activeElements: Array<{ index: number }>) {
        const data = this.insights.aggregatedData();
        if (!activeElements.length) return;

        const index = activeElements[0].index;
        const period = data.periods[index];
        if (!period) return;

        this.filter.setDateRange(period.start, period.end);
    }

    private csvCell(value: string): string {
        const safe = value.replace(/"/g, '""');
        return `"${safe}"`;
    }
}
