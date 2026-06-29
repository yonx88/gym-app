import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-narrow">
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center;">
        <div class="center-col mt-24" style="margin-bottom:32px;">
          <h1 style="font-size:24px;">إنشاء حساب جديد</h1>
          <p class="muted mt-8">خطوة وحدة وتبدأ تتابع تمارينك</p>
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
          <input type="password" [(ngModel)]="password" placeholder="6 أحرف على الأقل" autocomplete="new-password" />
        </div>
        <div class="field">
          <label>تأكيد كلمة المرور</label>
          <input type="password" [(ngModel)]="confirm" placeholder="أعد كتابة كلمة المرور" autocomplete="new-password" />
        </div>

        <button class="btn btn-primary" [disabled]="loading()" (click)="submit()">
          @if (loading()) {
            <span class="spinner"></span>
          } @else {
            إنشاء الحساب
          }
        </button>

        <p class="muted center-col mt-16" style="font-size:14px;">
          عندك حساب؟
          <a routerLink="/login" style="color:var(--accent); font-weight:700;"> سجّل دخولك</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  email = '';
  password = '';
  confirm = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  async submit() {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('عبّي الإيميل وكلمة المرور');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('كلمتا المرور غير متطابقتين');
      return;
    }
    this.loading.set(true);
    try {
      await this.auth.register(this.email.trim(), this.password);
      this.router.navigateByUrl('/onboarding');
    } catch (e: any) {
      this.error.set(e?.error?.error || 'تعذر إنشاء الحساب، حاول مرة ثانية');
    } finally {
      this.loading.set(false);
    }
  }
}
