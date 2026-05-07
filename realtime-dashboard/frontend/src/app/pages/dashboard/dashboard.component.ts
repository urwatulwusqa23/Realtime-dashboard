import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { SignalRService }       from '../../services/signalr.service';
import { MetricsService }       from '../../services/metrics.service';
import { MetricCardComponent }  from '../../components/metric-card/metric-card.component';
import { LineChartComponent }   from '../../components/line-chart/line-chart.component';
import { BarChartComponent }    from '../../components/bar-chart/bar-chart.component';
import { ChatSidebarComponent } from '../../components/chat-sidebar/chat-sidebar.component';
import { MetricSnapshot, MetricHistory } from '../../models/metric.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MetricCardComponent,
    LineChartComponent,
    BarChartComponent,
    ChatSidebarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  connected$ = this.signalR.connected$;
  paused$    = this.signalR.paused$;

  latestMetrics: MetricSnapshot[] = [];

  revenueHistory:    MetricHistory[] = [];
  ordersHistory:     MetricHistory[] = [];
  usersHistory:      MetricHistory[] = [];
  conversionHistory: MetricHistory[] = [];

  categoryData: { category: string; total: number }[] = [];

  private sub!: Subscription;
  private categoryRefreshCount = 0;

  constructor(
    private signalR: SignalRService,
    private metrics: MetricsService
  ) {}

  async ngOnInit(): Promise<void> {
    // Load historical data on startup
    this.metrics.getHistory('revenue',    60).subscribe(h => this.revenueHistory    = h);
    this.metrics.getHistory('orders',     60).subscribe(h => this.ordersHistory     = h);
    this.metrics.getHistory('users',      60).subscribe(h => this.usersHistory      = h);
    this.metrics.getHistory('conversion', 60).subscribe(h => this.conversionHistory = h);
    this.metrics.getByCategory('revenue').subscribe(d => this.categoryData = d);

    // Connect to SignalR
    await this.signalR.start();

    // Subscribe to live updates
    this.sub = this.signalR.metrics$.subscribe(snapshots => {
      this.latestMetrics = snapshots;
      this.appendToHistory(snapshots);

      // Refresh category bar chart every ~10 ticks (30 seconds)
      this.categoryRefreshCount++;
      if (this.categoryRefreshCount % 10 === 0) {
        this.metrics.getByCategory('revenue')
          .subscribe(d => this.categoryData = d);
      }
    });
  }

  private appendToHistory(snapshots: MetricSnapshot[]): void {
    const MAX = 60;

    for (const s of snapshots) {
      const point: MetricHistory = {
        value:      s.value,
        recordedAt: s.recordedAt,
        category:   s.category
      };

      const push = (arr: MetricHistory[]) => {
        arr.push(point);
        if (arr.length > MAX) arr.shift();
      };

      if (s.name === 'revenue')    push(this.revenueHistory);
      if (s.name === 'orders')     push(this.ordersHistory);
      if (s.name === 'users')      push(this.usersHistory);
      if (s.name === 'conversion') push(this.conversionHistory);
    }
  }

  getMetric(name: string): MetricSnapshot {
    return this.latestMetrics.find(m => m.name === name)
      ?? { name, value: 0, category: '-', recordedAt: '', changePercent: 0 };
  }

  togglePause(): void {
    this.signalR.togglePause();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
