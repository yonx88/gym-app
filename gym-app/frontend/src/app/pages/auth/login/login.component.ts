import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-narrow">
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
        <div class="center-col mt-24" style="margin-bottom:36px;">
          <div style="width:64px;height:64px;border-radius:18px;background:var(--accent-dim);
                      display:flex;align-items:center;justify-content:center;margin-bottom:14px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
              <path d="M6.5 6.5 4 9l3 3-3 3 2.5 2.5L9 15l3 3 3-3 2.5 2.5L20 15l-3-3 3-3-2.5-2.5L15 9l-3-3-3 3-2.5-2.5Z"/>
            </svg>
          </div>
          <h1 style="font-size:24px;">تسجيل الدخول</h1>
          <p class="muted mt-8">تابع تماريني واوزانك بسهولة</p>
        </div>

        @if (error()) {
          <div class="error-banner">{{ error() }}</div>
        }

        <div class="field">
          <label>الإيميل</label>
          <input type="email" [(ngModel)]="email" placeholder="example@email.com" autocomplete="email" />
        </div>
        <div class="field">
          <label>كلمة المرور</label>
          <input type="password" [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password" />
        </div>

        <button class="btn btn-primary" [disabled]="loading()" (click)="submit()">
          @if (loading()) {
            <span class="spinner"></span>
          } @else {
            دخول
          }
        </button>

        <p class="muted center-col mt-16" style="font-size:14px;">
          ما عندك حساب؟
          <a routerLink="/register" style="color:var(--accent); font-weight:700;"> سجّل الآن</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('عبّي الإيميل وكلمة المرور');
      return;
    }
    this.loading.set(true);
    try {
      const user = await this.auth.login(this.email.trim(), this.password);
      this.router.navigateByUrl(user.onboarded ? '/home' : '/onboarding');
    } catch (e: any) {
      this.error.set(e?.error?.error || 'تعذر تسجيل الدخول، حاول مرة ثانية');
    } finally {
      this.loading.set(false);
    }
  }
}
