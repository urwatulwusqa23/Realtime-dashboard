import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MetricHistory } from '../models/metric.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getHistory(name: string, limit = 60): Observable<MetricHistory[]> {
    return this.http.get<MetricHistory[]>(
      `${this.base}/metrics/history?name=${name}&limit=${limit}`
    );
  }

  getSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/metrics/summary`);
  }

  getByCategory(name: string): Observable<{ category: string; total: number }[]> {
    return this.http.get<any[]>(
      `${this.base}/metrics/by-category?name=${name}`
    );
  }
}
