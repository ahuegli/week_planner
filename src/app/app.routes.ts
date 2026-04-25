import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'today',
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
    path: '**',
    redirectTo: 'login',
  },
];
