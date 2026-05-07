import { Injectable, OnDestroy } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { MetricSnapshot } from '../models/metric.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {

  private hub!: signalR.HubConnection;

  readonly metrics$   = new Subject<MetricSnapshot[]>();
  readonly connected$ = new BehaviorSubject<boolean>(false);
  readonly paused$    = new BehaviorSubject<boolean>(false);

  constructor() {
    this.buildConnection();
  }

  private buildConnection(): void {
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hub.on('MetricUpdate', (snapshots: MetricSnapshot[]) => {
      if (!this.paused$.value) {
        this.metrics$.next(snapshots);
      }
    });

    this.hub.onreconnecting(() => this.connected$.next(false));
    this.hub.onreconnected(() => this.connected$.next(true));
    this.hub.onclose(() => this.connected$.next(false));
  }

  async start(): Promise<void> {
    try {
      await this.hub.start();
      this.connected$.next(true);
    } catch (err) {
      console.error('SignalR connection error:', err);
      setTimeout(() => this.start(), 5000);
    }
  }

  togglePause(): void {
    this.paused$.next(!this.paused$.value);
  }

  ngOnDestroy(): void {
    this.hub.stop();
  }
}
