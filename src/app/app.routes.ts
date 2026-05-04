import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { AuthService } from './core/services/auth.service';

export const routes: Routes = [
  {
    path: 'signup',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [() => (inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/today']) : true)],
    loadComponent: () => import('./features/landing/landing.page').then((m) => m.LandingPageComponent),
  },
  {
    path: 'today',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/today.page').then((m) => m.TodayPageComponent),
  },
  {
    path: 'week',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/week.page').then((m) => m.WeekPageComponent),
  },
  {
    path: 'plan',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/plan.page').then((m) => m.PlanPageComponent),
  },
  {
    path: 'settings',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPageComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/onboarding.page').then((m) => m.OnboardingPageComponent),
  },
  {
    path: 'cycle',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/cycle.page').then((m) => m.CyclePageComponent),
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/notes.page').then((m) => m.NotesPageComponent),
  },
  {
    path: 'stats',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/stats.page').then((m) => m.StatsPageComponent),
  },
  {
    path: 'workout/:eventId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/workout/workout.page').then((m) => m.WorkoutPageComponent),
  },
  {
    path: 'coach',
    canActivate: [authGuard],
    loadComponent: () => import('./features/coach/coach.page').then((m) => m.CoachPageComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
