import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const TEMPLATES = [
  { id: 'ppl', name: 'بوش / بل / ليقز', desc: 'دفع، سحب، أرجل بالتكرار' },
  { id: 'upper_lower', name: 'أبر داون', desc: 'علوي ثم سفلي بالتكرار' },
  { id: 'bro_split', name: 'يوم لكل عضلة', desc: 'صدر، ظهر، أرجل، أكتاف، أذرع' },
  { id: 'custom', name: 'جدولي الخاص', desc: 'أبني التمارين بنفسي من الصفر' },
];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-narrow">
      <div class="row-between mt-8" style="margin-bottom:24px;">
        @for (s of [1,2,3]; track s) {
          <div style="flex:1; height:4px; border-radius:4px; margin:0 3px;"
               [style.background]="step() >= s ? 'var(--accent)' : 'var(--border)'"></div>
        }
      </div>

      @if (error()) { <div class="error-banner">{{ error() }}</div> }

      @if (step() === 1) {
        <h1>بياناتك الأساسية</h1>
        <p class="muted mt-8 mb-16">تساعدنا نحسب لك تقدير السعرات المحروقة</p>
        <div class="field mt-24">
          <label>الطول (سم)</label>
          <input type="number" [(ngModel)]="height" placeholder="مثال: 175" />
        </div>
        <div class="field">
          <label>الوزن (كجم)</label>
          <input type="number" [(ngModel)]="weight" placeholder="مثال: 80" />
        </div>
        <button class="btn btn-primary mt-16" (click)="goStep2()">التالي</button>
      }

      @if (step() === 2) {
        <h1>كم يوم تجي النادي؟</h1>
        <p class="muted mt-8" style="margin-bottom:18px;">اختر الأيام اللي تنزل فيها النادي</p>
        <div class="chip-row">
          @for (d of dayNames; track $index) {
            <button class="chip" [class.active]="gymDays().includes($index)" (click)="toggleDay($index)">
              {{ d }}
            </button>
          }
        </div>
        <div class="row gap-8 mt-24">
          <button class="btn btn-ghost" (click)="step.set(1)">رجوع</button>
          <button class="btn btn-primary" [disabled]="gymDays().length === 0" (click)="step.set(3)">التالي</button>
        </div>
      }

      @if (step() === 3) {
        <h1>وش نوع جدولك؟</h1>
        <p class="muted mt-8" style="margin-bottom:18px;">نقدر نعبي التمارين تلقائيًا، أو تبنيها بنفسك</p>
        <div style="display:flex; flex-direction:column; gap:10px;">
          @for (t of templates; track t.id) {
            <button class="card" style="text-align:right; border-color: var(--border);"
                    [style.borderColor]="scheduleType() === t.id ? 'var(--accent)' : 'var(--border)'"
                    (click)="scheduleType.set(t.id)">
              <div class="row-between">
                <div>
                  <div style="font-weight:800;">{{ t.name }}</div>
                  <div class="muted" style="font-size:13px; margin-top:3px;">{{ t.desc }}</div>
                </div>
                <div style="width:20px;height:20px;border-radius:50%;border:2px solid var(--border);flex:none;"
                     [style.borderColor]="scheduleType() === t.id ? 'var(--accent)' : 'var(--border)'"
                     [style.background]="scheduleType() === t.id ? 'var(--accent)' : 'transparent'"></div>
              </div>
            </button>
          }
        </div>
        <div class="row gap-8 mt-24">
          <button class="btn btn-ghost" (click)="step.set(2)">رجوع</button>
          <button class="btn btn-primary" [disabled]="!scheduleType() || loading()" (click)="finish()">
            @if (loading()) { <span class="spinner"></span> } @else { ننطلق 🔥 }
          </button>
        </div>
      }
    </div>
  `,
})
export class OnboardingComponent {
  step = signal(1);
  height: number | null = null;
  weight: number | null = null;
  gymDays = signal<number[]>([]);
  scheduleType = signal<string>('');
  loading = signal(false);
  error = signal('');

  dayNames = DAY_NAMES;
  templates = TEMPLATES;

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  toggleDay(i: number) {
    const cur = this.gymDays();
    this.gymDays.set(cur.includes(i) ? cur.filter((d) => d !== i) : [...cur, i]);
  }

  goStep2() {
    this.error.set('');
    this.step.set(2);
  }

  async finish() {
    this.error.set('');
    this.loading.set(true);
    try {
      if (this.height || this.weight) {
        await this.api.updateProfile({
          height_cm: this.height ?? undefined,
          weight_kg: this.weight ?? undefined,
        });
      }

      if (this.scheduleType() === 'custom') {
        for (let dow = 0; dow < 7; dow++) {
          const isGym = this.gymDays().includes(dow);
          await this.api.updateDay(dow, {
            is_gym_day: isGym,
            label: isGym ? 'تمرين' : 'راحة',
          });
        }
        this.auth.markOnboarded();
        this.router.navigateByUrl('/schedule');
      } else {
        await this.api.applyTemplate(this.gymDays(), this.scheduleType());
        this.auth.markOnboarded();
        this.router.navigateByUrl('/home');
      }
    } catch (e: any) {
      this.error.set(e?.error?.error || 'حدث خطأ، حاول مرة ثانية');
    } finally {
      this.loading.set(false);
    }
  }
}
