import {
  Component, Input, OnChanges, OnDestroy,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  template: `<div class="chart-wrap"><canvas #canvas></canvas></div>`,
  styles: [`
    .chart-wrap {
      background: #1e2433;
      border: 1px solid #2d3349;
      border-radius: 12px;
      padding: 16px;
      height: 220px;
    }
  `]
})
export class BarChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() categories: { category: string; total: number }[] = [];
  @Input() label = 'By Category';

  private chart?: Chart;
  private readonly colors = ['#6366f1', '#34d399', '#f59e0b', '#f87171',
                             '#60a5fa', '#a78bfa', '#fb923c', '#4ade80'];

  ngAfterViewInit(): void { this.buildChart(); }

  ngOnChanges(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.categories.map(c => c.category);
    this.chart.data.datasets[0].data = this.categories.map(c => c.total);
    this.chart.update('none');
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.categories.map(c => c.category),
        datasets: [{
          label: this.label,
          data: this.categories.map(c => c.total),
          backgroundColor: this.colors,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e2433',
            borderColor: '#2d3349',
            borderWidth: 1,
            titleColor: '#8892a4',
            bodyColor: '#e2e8f0',
          }
        },
        scales: {
          x: {
            ticks: { color: '#4a5568', font: { size: 11 } },
            grid:  { display: false }
          },
          y: {
            ticks: { color: '#4a5568', font: { size: 11 } },
            grid:  { color: '#2d3349' }
          }
        }
      }
    });
  }
}
