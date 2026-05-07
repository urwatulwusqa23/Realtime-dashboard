import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ChatMessage } from '../models/metric.model';
import { environment } from '../../environments/environment';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private base = environment.apiUrl;

  private _messages = new BehaviorSubject<ChatMessage[]>([]);
  readonly messages$ = this._messages.asObservable();

  private _loading = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading.asObservable();

  sessionId: string = uuidv4();

  constructor(private http: HttpClient) {}

  ask(question: string, chartDataJson: string): Observable<any> {
    this.addMessage({ role: 'user', content: question });
    this._loading.next(true);

    return this.http.post(`${this.base}/chat/ask`, {
      question,
      chartDataJson,
      sessionId: this.sessionId
    }).pipe(
      tap({
        next: (res: any) => {
          this.sessionId = res.sessionId;
          this.addMessage({ role: 'assistant', content: res.answer });
          this._loading.next(false);
        },
        error: () => {
          this.addMessage({
            role: 'assistant',
            content: '⚠️ Could not reach the AI service. Check your Claude API key in `appsettings.json`.'
          });
          this._loading.next(false);
        }
      })
    );
  }

  clearHistory(): void {
    this._messages.next([]);
    this.sessionId = uuidv4();
  }

  private addMessage(msg: ChatMessage): void {
    this._messages.next([
      ...this._messages.value,
      { ...msg, createdAt: new Date() }
    ]);
  }
}
