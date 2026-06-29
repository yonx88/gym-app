import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Exercise, TodayWorkout } from '../../core/services/api.service';

interface ExerciseRow extends Exercise {
  draftWeight: number | null;
  draftSets: number;
  draftReps: number;
  checked: boolean;
  saving?: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="center-col" style="padding-top:80px;"><span class="spinner"></span></div>
      } @else if (data()) {
        <div class="row-between">
          <div>
            <p class="muted" style="font-size:13px;">{{ data()!.date }}</p>
            <h1 style="font-size:26px; margin-top:2px;">{{ data()!.day_name }}</h1>
          </div>
          <div class="card" style="padding:10px 16px; text-align:center; border-color: var(--accent);">
            <div class="muted" style="font-size:11px;">سعرات اليوم</div>
            <div class="num" style="font-size:20px; color:var(--accent);">
              {{ data()!.calories_today || '—' }}
            </div>
          </div>
        </div>

        @if (!data()!.is_gym_day) {
          <div class="card center-col mt-24" style="padding:32px 16px;">
            <div style="font-size:40px;">😌</div>
            <h2 class="mt-8" style="font-size:18px;">يوم راحة</h2>
            <p class="muted mt-8">خذ راحتك اليوم، عضلاتك تبني نفسها وقت الراحة</p>
          </div>
        } @else {
          <div class="row-between mt-16">
            <div class="chip active">{{ data()!.label }}</div>
            @if (data()!.is_completed) {
              <div class="chip" style="background:var(--success-dim); border-color:var(--success); color:var(--success);">
                ✓ مكتمل
              </div>
            }
          </div>

          @if (data()!.has_cardio) {
            <div class="card mt-16">
              <div class="row-between">
                <div class="row gap-8">
                  <span style="font-size:20px;">🏃</span>
                  <div>
                    <div style="font-weight:700;">{{ data()!.cardio_machine }}</div>
                    <div class="muted" style="font-size:12.5px;">كارديو اليوم</div>
                  </div>
                </div>
                <div class="num" style="font-size:18px;">{{ data()!.cardio_minutes }} د</div>
              </div>
            </div>
          }

          <div class="mt-16" style="display:flex; flex-direction:column; gap:10px;">
            @for (ex of rows(); track ex.id) {
              <div class="card">
                <div class="row-between" (click)="openExercise(ex.id)" style="cursor:pointer;">
                  <div class="row gap-12">
                    <div style="width:46px;height:46px;border-radius:12px;background:var(--surface-2);
                                display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none;">
                      @if (ex.image_path) {
                        <img [src]="imgUrl(ex.image_path)" style="width:100%;height:100%;object-fit:cover;" />
                      } @else {
                        <span style="font-size:20px;">🏋️</span>
                      }
                    </div>
                    <div>
                      <div style="font-weight:700;">{{ ex.name }}</div>
                      @if (ex.last_log) {
                        <div class="muted" style="font-size:12px; margin-top:2px;">
                          آخر مرة: <span class="num">{{ ex.last_log.weight_kg || 0 }}</span> كجم ×
                          <span class="num">{{ ex.last_log.reps_done || ex.target_reps }}</span>
                        </div>
                      } @else {
                        <div class="muted" style="font-size:12px; margin-top:2px;">أول مرة تسويه</div>
                      }
                    </div>
                  </div>
                  <button class="check-btn" [class.checked]="ex.checked" (click)="toggleCheck(ex, $event)">
                    @if (ex.checked) { ✓ }
                  </button>
                </div>

                <div class="divider"></div>
                <div class="row gap-8">
                  <div class="mini-field">
                    <label>كجم</label>
                    <input type="number" [(ngModel)]="ex.draftWeight" (change)="saveLog(ex)" />
                  </div>
                  <div class="mini-field">
                    <label>جولات</label>
                    <input type="number" [(ngModel)]="ex.draftSets" (change)="saveLog(ex)" />
                  </div>
                  <div class="mini-field">
                    <label>تكرارات</label>
                    <input type="number" [(ngModel)]="ex.draftReps" (change)="saveLog(ex)" />
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="mt-24">
            @if (!data()!.is_completed) {
              <button class="btn btn-success" [disabled]="finishing()" (click)="finishDay()">
                @if (finishing()) { <span class="spinner"></span> } @else { أنهيت تمارين اليوم ✅ }
              </button>
            } @else {
              <button class="btn btn-ghost" (click)="undoFinish()">تراجع عن الإنهاء</button>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .check-btn {
      width: 34px; height: 34px; border-radius: 50%;
      border: 2px solid var(--border); background: transparent;
      color: var(--success); font-weight: 900; flex: none;
    }
    .check-btn.checked { background: var(--success-dim); border-color: var(--success); }
    .mini-field { flex: 1; }
    .mini-field label { display:block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px; text-align:center; }
    .mini-field input {
      width: 100%; background: var(--surface-2); border: 1px solid var(--border);
      color: var(--text); border-radius: 8px; padding: 8px; text-align: center; font-weight: 700;
    }
  `],
})
export class HomeComponent implements OnInit {
  loading = signal(true);
  finishing = signal(false);
  data = signal<TodayWorkout | null>(null);
  rows = signal<ExerciseRow[]>([]);

  constructor(private api: ApiService, private router: Router) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const today = await this.api.getToday();
      this.data.set(today);
      this.rows.set(
        (today.exercises || []).map((ex) => ({
          ...ex,
          draftWeight: ex.today_log?.weight_kg ?? ex.last_log?.weight_kg ?? null,
          draftSets: ex.today_log?.sets_done ?? ex.target_sets,
          draftReps: ex.today_log?.reps_done ?? ex.last_log?.reps_done ?? ex.target_reps,
          checked: !!ex.today_log?.is_checked,
        }))
      );
    } finally {
      this.loading.set(false);
    }
  }

  imgUrl(path: string | null) {
    return this.api.imageUrl(path);
  }

  openExercise(id: number) {
    this.router.navigate(['/exercise', id]);
  }

  async toggleCheck(ex: ExerciseRow, event: Event) {
    event.stopPropagation();
    ex.checked = !ex.checked;
    await this.saveLog(ex);
  }

  async saveLog(ex: ExerciseRow) {
    ex.saving = true;
    try {
      await this.api.logExercise({
        exercise_id: ex.id,
        weight_kg: ex.draftWeight ?? undefined,
        sets_done: ex.draftSets ?? undefined,
        reps_done: ex.draftReps ?? undefined,
        is_checked: ex.checked,
      });
    } finally {
      ex.saving = false;
    }
  }

  async finishDay() {
    this.finishing.set(true);
    try {
      const res = await this.api.finishDay();
      this.data.update((d) => (d ? { ...d, is_completed: true, calories_today: res.calories_estimate } : d));
    } finally {
      this.finishing.set(false);
    }
  }

  async undoFinish() {
    await this.api.undoFinishDay();
    this.data.update((d) => (d ? { ...d, is_completed: false, calories_today: 0 } : d));
  }
}
