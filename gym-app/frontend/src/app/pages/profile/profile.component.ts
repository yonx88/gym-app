import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Profile } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

const SCHEDULE_LABELS: Record<string, string> = {
  ppl: 'بوش / بل / ليقز',
  upper_lower: 'أبر داون',
  bro_split: 'يوم لكل عضلة',
  custom: 'جدول خاص',
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <h1 style="font-size:24px;">حسابي</h1>

      @if (loading()) {
        <div class="center-col" style="padding-top:60px;"><span class="spinner"></span></div>
      } @else if (profile()) {
        <div class="card mt-16">
          <div class="muted" style="font-size:13px;">الإيميل</div>
          <div style="font-weight:700; margin-top:4px;">{{ profile()!.email }}</div>
        </div>

        <div class="card mt-16">
          <div class="field">
            <label>الطول (سم)</label>
            <input type="number" [(ngModel)]="height" />
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>الوزن (كجم)</label>
            <input type="number" [(ngModel)]="weight" />
          </div>
        </div>
        <button class="btn btn-primary mt-16" [disabled]="saving()" (click)="save()">
          @if (saving()) { <span class="spinner"></span> } @else { حفظ التغييرات }
        </button>
        @if (saved()) { <p class="muted center-col mt-8" style="color:var(--success);">تم الحفظ ✓</p> }

        <div class="card mt-16">
          <div class="row-between">
            <span class="muted">نوع الجدول</span>
            <span style="font-weight:700;">{{ scheduleLabel() }}</span>
          </div>
        </div>

        <button class="btn btn-danger-ghost mt-24" (click)="logout()">تسجيل الخروج</button>
      }
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  saved = signal(false);
  profile = signal<Profile | null>(null);
  height: number | null = null;
  weight: number | null = null;

  constructor(private api: ApiService, private auth: AuthService) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const p = await this.api.getProfile();
      this.profile.set(p);
      this.height = p.height_cm;
      this.weight = p.weight_kg;
    } finally {
      this.loading.set(false);
    }
  }

  scheduleLabel() {
    return SCHEDULE_LABELS[this.profile()?.schedule_type || 'custom'] || 'جدول خاص';
  }

  async save() {
    this.saving.set(true);
    this.saved.set(false);
    try {
      const updated = await this.api.updateProfile({
        height_cm: this.height ?? undefined,
        weight_kg: this.weight ?? undefined,
      });
      this.profile.set(updated);
      this.saved.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  logout() {
    this.auth.logout();
  }
}
