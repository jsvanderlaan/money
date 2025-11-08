import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { FilterService } from '../../../services/filter.service';
import { AggregatedData, InsightsService } from '../../../services/insights.service';

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

    constructor() {
        // Watch filter changes and update chart when data changes
        effect(() => {
            const data = this.insights.aggregatedData();
            if (this.chart) {
                this.updateChart(data);
            }
        });
    }

    ngAfterViewInit(): void {
        this.createChart();
        const data = this.insights.aggregatedData();
        this.updateChart(data);
    }

    private createChart(): void {
        const ctx = this.chartCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Total Amount',
                        data: [],
                        backgroundColor: 'rgb(59, 130, 246)',
                    },
                ],
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `€${value}`,
                        },
                    },
                },
            },
        });
    }

    private updateChart(data: AggregatedData): void {
        if (!this.chart) return;

        // Update chart with new data
        this.chart.data.labels = data.labels;
        this.chart.data.datasets[0].data = data.values;

        // Update chart title based on selected label
        const labelId = this.filter.selectedLabelIds()[0];
        this.chart.options.plugins!.title!.text = labelId ? `Average Amount for Selected Label` : 'Average Transaction Amount';

        this.chart.update();
    }
}
