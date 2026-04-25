import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly isRegisterMode = signal(false);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  constructor() {
    if (this.authService.isAuthenticated()) {
      void this.router.navigate(['/today']);
    }
  }

  protected toggleMode(): void {
    this.isRegisterMode.update((value) => !value);
    this.errorMessage.set(null);
  }

  protected async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const email = this.email().trim();
    const password = this.password().trim();
    const name = this.name().trim();

    if (!email || !password || (this.isRegisterMode() && !name)) {
      this.errorMessage.set('Please complete all required fields.');
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      if (this.isRegisterMode()) {
        await firstValueFrom(this.authService.register(email, password, name));
      } else {
        await firstValueFrom(this.authService.login(email, password));
      }

      await this.router.navigate(['/today']);
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (!(error instanceof HttpErrorResponse)) {
      return 'Something went wrong. Please try again.';
    }

    const payload = error.error;

    if (Array.isArray(payload?.message)) {
      return payload.message.join(', ');
    }

    if (typeof payload?.message === 'string') {
      return payload.message;
    }

    if (typeof payload === 'string') {
      return payload;
    }

    return 'Authentication failed. Please check your details.';
  }
}
