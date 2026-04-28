import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoachApiService, ChatMessage, SuggestedAction } from '../../core/services/coach-api.service';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestedAction?: SuggestedAction;
}

const STARTER_CHIPS = [
  'How should I train today?',
  "I'm feeling tired",
  'Can I swap today\'s workout?',
  'Am I on track for my goal?',
];

@Component({
  selector: 'app-coach-page',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './coach.page.html',
  styleUrl: './coach.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachPageComponent implements OnInit {
  private readonly coachApi = inject(CoachApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly messages = signal<DisplayMessage[]>([]);
  protected readonly inputText = signal('');
  protected readonly isLoading = signal(false);
  protected readonly showChips = signal(true);
  protected readonly chips = STARTER_CHIPS;

  private workoutContext: string | undefined;

  protected readonly hasMessages = computed(() => this.messages().length > 0);

  ngOnInit(): void {
    const workout = this.route.snapshot.queryParamMap.get('workout');
    if (workout) {
      this.workoutContext = workout;
    }

    this.messages.set([
      {
        role: 'assistant',
        content: "Hey! I'm your AI coach. Ask me anything about your training — I can help you adjust sessions, answer questions about your plan, or give advice based on how you're feeling today.",
      },
    ]);
  }

  protected goBack(): void {
    void this.router.navigate(['/today']);
  }

  protected setInput(value: string): void {
    this.inputText.set(value);
  }

  protected sendChip(chip: string): void {
    this.showChips.set(false);
    this.inputText.set(chip);
    this.send();
  }

  protected send(): void {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;

    this.inputText.set('');
    this.showChips.set(false);

    const userMsg: DisplayMessage = { role: 'user', content: text };
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.isLoading.set(true);

    // Build history for API — include only real conversation (skip welcome message)
    const apiMessages: ChatMessage[] = this.messages()
      .filter((m) => !(m.role === 'assistant' && m === this.messages()[0]))
      .map((m) => ({ role: m.role, content: m.content }))
      .slice(-5);

    this.coachApi.chat(apiMessages, this.workoutContext).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: res.reply, suggestedAction: res.suggestedAction },
        ]);
      },
      error: () => {
        this.isLoading.set(false);
        this.messages.update((msgs) => [
          ...msgs,
          { role: 'assistant', content: "Sorry, I couldn't reach the server. Please try again." },
        ]);
      },
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  protected dismissSuggestion(msgIndex: number): void {
    this.messages.update((msgs) =>
      msgs.map((m, i) => (i === msgIndex ? { ...m, suggestedAction: undefined } : m)),
    );
  }

  protected acceptSuggestion(msgIndex: number): void {
    // For now, just dismiss — full wiring is deferred
    this.dismissSuggestion(msgIndex);
  }
}
