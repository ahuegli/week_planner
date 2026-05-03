import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-coach-page',
  template: `
    <section class="coach-coming-soon-page">
      <article class="coming-soon-card" aria-live="polite">
        <div class="icon-wrap" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l1.9 4.5L18 9.4l-4.1 1.4L12 15.3l-1.9-4.5L6 9.4l4.1-1.9L12 3z"/>
            <path d="M5 15l.9 2.1L8 18l-2.1.9L5 21l-.9-2.1L2 18l2.1-.9L5 15z"/>
            <path d="M19 14l.7 1.6L21.3 16l-1.6.7L19 18.3l-.7-1.6L16.7 16l1.6-.4L19 14z"/>
          </svg>
        </div>

        <h1 class="page-title">AI Coach is coming soon</h1>
        <p class="page-copy">
          Your personalized training assistant is in development. We'll notify you when it's ready.
        </p>

        <button type="button" class="btn-primary" (click)="goToPlan()">Back to Plan</button>
      </article>
    </section>
  `,
  styles: `
    .coach-coming-soon-page {
      min-height: calc(100vh - 170px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px 96px;
    }

    .coming-soon-card {
      width: 100%;
      max-width: 520px;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: 16px;
      padding: 28px 22px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
    }

    .icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(45, 77, 122, 0.08);
      color: var(--color-primary);
    }

    .page-title {
      margin: 4px 0 0;
      font-family: Georgia, serif;
      font-size: 28px;
      line-height: 1.2;
      color: var(--color-text);
    }

    .page-copy {
      margin: 0;
      max-width: 420px;
      color: var(--color-text-secondary);
      font-size: 14px;
      line-height: 1.5;
    }

    .btn-primary {
      margin-top: 10px;
      background: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachPageComponent {
  private readonly router = inject(Router);
  protected goToPlan(): void {
    void this.router.navigate(['/plan']);
  }
}
