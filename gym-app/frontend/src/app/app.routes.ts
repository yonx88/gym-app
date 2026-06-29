import { Routes } from '@angular/router';
import { authGuard, onboardingGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/onboarding/onboarding.component').then((m) => m.OnboardingComponent),
  },
  {
    path: 'home',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'exercise/:id',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./pages/exercise-detail/exercise-detail.component').then(
        (m) => m.ExerciseDetailComponent
      ),
  },
  {
    path: 'timesheet',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/timesheet/timesheet.component').then((m) => m.TimesheetComponent),
  },
  {
    path: 'schedule',
    canActivate: [onboardingGuard],
    loadComponent: () =>
      import('./pages/schedule-builder/schedule-builder.component').then(
        (m) => m.ScheduleBuilderComponent
      ),
  },
  {
    path: 'profile',
    canActivate: [onboardingGuard],
    loadComponent: () => import('./pages/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '**', redirectTo: 'home' },
];
