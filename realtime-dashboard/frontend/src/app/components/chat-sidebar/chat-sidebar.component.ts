import {
  Component, Input, ViewChild,
  ElementRef, AfterViewChecked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { MetricSnapshot } from '../../models/metric.model';
import { marked } from 'marked';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-sidebar.component.html',
  styleUrls: ['./chat-sidebar.component.scss']
})
export class ChatSidebarComponent implements AfterViewChecked {
  @ViewChild('messagesEnd') messagesEnd!: ElementRef;
  @Input() currentMetrics: MetricSnapshot[] = [];

  question  = '';
  messages$ = this.chatService.messages$;
  loading$  = this.chatService.loading$;

  suggestions = [
    'Why did revenue spike?',
    'Which region is underperforming?',
    'What is the conversion rate trend?',
    'Are orders growing or declining?'
  ];

  constructor(private chatService: ChatService) {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  send(): void {
    const q = this.question.trim();
    if (!q) return;

    const chartJson = JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.currentMetrics
    });

    this.chatService.ask(q, chartJson).subscribe();
    this.question = '';
  }

  useSuggestion(s: string): void {
    this.question = s;
    this.send();
  }

  parseMarkdown(content: string): string {
    return marked.parse(content) as string;
  }

  clear(): void {
    this.chatService.clearHistory();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch { /* ignore */ }
  }
}
