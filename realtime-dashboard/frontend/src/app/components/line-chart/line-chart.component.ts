import {
  Component, Input, OnChanges, OnDestroy,
  ViewChild, ElementRef, AfterViewInit
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { MetricHistory } from '../../models/metric.model';

Chart.register(...registerables);

@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `
    <div class="chart-wrap">
      <canvas #canvas></canvas>
    </div>
  `,
  styles: [`
    .chart-wrap {
      background: #1e2433;
      border: 1px solid #2d3349;
      border-radius: 12px;
      padding: 16px;
      height: 220px;
    }
    canvas { width: 100% !important; }
  `]
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() data: MetricHistory[] = [];
  @Input() label = 'Metric';
  @Input() color = '#6366f1';

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.buildChart();
  }

  ngOnChanges(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.data.map(d =>
      new Date(d.recordedAt).toLocaleTimeString('en-US', { hour12: false }));
    this.chart.data.datasets[0].data = this.data.map(d => d.value);
    this.chart.update('none');
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.map(d =>
          new Date(d.recordedAt).toLocaleTimeString('en-US', { hour12: false })),
        datasets: [{
          label: this.label,
          data: this.data.map(d => d.value),
          borderColor: this.color,
          backgroundColor: this.color + '18',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: this.color,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { intersect: false, mode: 'index' },
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
            ticks: {
              color: '#4a5568',
              maxTicksLimit: 8,
              font: { size: 11 }
            },
            grid: { color: '#1e2433' }
          },
          y: {
            ticks: {
              color: '#4a5568',
              font: { size: 11 }
            },
            grid: { color: '#2d3349' }
          }
        }
      }
    });
  }
}
