import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { BottomTabNavComponent } from './components/bottom-tab-nav/bottom-tab-nav.component';
import { UiFeedbackService } from './shared/ui-feedback.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomTabNavComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly uiFeedback = inject(UiFeedbackService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly feedbackMessage = this.uiFeedback.message;

  protected shouldShowBottomNav(): boolean {
    const rawUrl = this.currentUrl();
    const path = rawUrl.split('?')[0]?.split('#')[0] ?? rawUrl;
    const isLogin = path === '/login' || path.startsWith('/login/');
    const isOnboarding = path === '/onboarding' || path.startsWith('/onboarding/');
    const isWorkout = path.startsWith('/workout/');
    const isStats = path === '/stats' || path.startsWith('/stats/');
    return !isLogin && !isOnboarding && !isWorkout && !isStats;
  }
}
