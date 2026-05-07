import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricSnapshot } from '../../models/metric.model';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metric-card.component.html',
  styleUrls: ['./metric-card.component.scss']
})
export class MetricCardComponent {
  @Input() metric!: MetricSnapshot;

  get displayName(): string {
    const map: Record<string, string> = {
      revenue:    'Revenue',
      orders:     'Orders',
      users:      'Active Users',
      conversion: 'Conversion Rate'
    };
    return map[this.metric.name] ?? this.metric.name;
  }

  get formattedValue(): string {
    switch (this.metric.name) {
      case 'revenue':
        return '$' + Math.round(this.metric.value).toLocaleString('en-US');
      case 'conversion':
        return this.metric.value.toFixed(2) + '%';
      default:
        return Math.round(this.metric.value).toLocaleString();
    }
  }

  get absChange(): string {
    return Math.abs(this.metric.changePercent).toFixed(1);
  }

  get isSpike(): boolean {
    return Math.abs(this.metric.changePercent) > 10;
  }

  get isPositive(): boolean {
    return this.metric.changePercent >= 0;
  }
}
