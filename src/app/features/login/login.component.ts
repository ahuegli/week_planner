import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = this.authService.loading;
  readonly error = this.authService.error;

  email = signal('');
  password = signal('');
  isRegisterMode = signal(false);
  name = signal('');

  onSubmit(): void {
    if (this.isRegisterMode()) {
      this.authService
        .register({
          email: this.email(),
          password: this.password(),
          name: this.name() || undefined,
        })
        .subscribe({
          next: () => this.router.navigate(['/']),
        });
    } else {
      this.authService
        .login({
          email: this.email(),
          password: this.password(),
        })
        .subscribe({
          next: () => this.router.navigate(['/']),
        });
    }
  }

  toggleMode(): void {
    this.isRegisterMode.update((v) => !v);
    this.authService.clearError();
  }

  useDemoCredentials(): void {
    this.email.set('demo@example.com');
    this.password.set('demo123');
  }
}
