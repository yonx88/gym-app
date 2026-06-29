import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, ScheduleDay, LibraryExercise } from '../../core/services/api.service';

const CARDIO_MACHINES = ['مشاية', 'دراجة ثابتة', 'إليبتيكال', 'مدرج (Stairmaster)', 'حبل نطر'];

const TEMPLATES = [
  { id: 'ppl', name: 'بوش / بل / ليقز' },
  { id: 'upper_lower', name: 'أبر داون' },
  { id: 'bro_split', name: 'يوم لكل عضلة' },
];

@Component({
  selector: 'app-schedule-builder',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="row-between">
        <h1 style="font-size:24px;">جدولي</h1>
        <button class="btn btn-outline btn-sm" (click)="showTemplates.set(!showTemplates())">قالب جاهز</button>
      </div>

      @if (showTemplates()) {
        <div class="card mt-16">
          <p class="muted" style="font-size:13px; margin-bottom:10px;">
            سيتم تعبية التمارين تلقائيًا على أيام النادي الحالية المحددة
          </p>
          <div class="chip-row">
            @for (t of templates; track t.id) {
              <button class="chip" (click)="applyTemplate(t.id)">{{ t.name }}</button>
            }
          </div>
        </div>
      }

      @if (loading()) {
        <div class="center-col" style="padding-top:60px;"><span class="spinner"></span></div>
      } @else {
        <div class="mt-16" style="display:flex; flex-direction:column; gap:10px;">
          @for (day of days(); track day.day_of_week) {
            <div class="card">
              <div class="row-between" style="cursor:pointer;" (click)="toggleExpand(day.day_of_week)">
                <div class="row gap-12">
                  <div class="switch" [class.on]="day.is_gym_day" (click)="quickToggleGym(day, $event)">
                    <div class="knob"></div>
                  </div>
                  <div>
                    <div style="font-weight:700;">{{ day.day_name }}</div>
                    <div class="muted" style="font-size:12.5px;">{{ day.is_gym_day ? day.label : 'راحة' }}</div>
                  </div>
                </div>
                <span class="muted">{{ expanded() === day.day_of_week ? '−' : '+' }}</span>
              </div>

              @if (expanded() === day.day_of_week) {
                <div class="divider"></div>

                @if (day.is_gym_day) {
                  <div class="field">
                    <label>تسمية اليوم</label>
                    <input type="text" [(ngModel)]="day.label" (change)="saveDayMeta(day)" placeholder="مثال: دفع" />
                  </div>

                  <label class="row gap-8" style="font-size:13px; color:var(--text-muted); font-weight:600; margin-bottom:10px;">
                    <input type="checkbox" [(ngModel)]="day.has_cardio" (change)="saveDayMeta(day)" />
                    أضف كارديو لهذا اليوم
                  </label>

                  @if (day.has_cardio) {
                    <div class="row gap-8 mt-8">
                      <div class="field" style="flex:1.4;">
                        <label>الجهاز</label>
                        <select [(ngModel)]="day.cardio_machine" (change)="saveDayMeta(day)">
                          @for (m of cardioMachines; track m) { <option [value]="m">{{ m }}</option> }
                        </select>
                      </div>
                      <div class="field" style="flex:1;">
                        <label>الدقائق</label>
                        <input type="number" [(ngModel)]="day.cardio_minutes" (change)="saveDayMeta(day)" />
                      </div>
                    </div>
                  }

                  <div class="divider"></div>
                  <div class="muted" style="font-size:13px; margin-bottom:8px;">التمارين</div>

                  <div style="display:flex; flex-direction:column; gap:8px;">
                    @for (ex of day.exercises; track ex.id) {
                      <div class="ex-row">
                        <input type="text" [(ngModel)]="ex.name" (change)="saveExercise(ex)" class="ex-name" />
                        <input type="number" [(ngModel)]="ex.target_sets" (change)="saveExercise(ex)" class="ex-num" />
                        <span class="muted" style="font-size:11px;">×</span>
                        <input type="number" [(ngModel)]="ex.target_reps" (change)="saveExercise(ex)" class="ex-num" />
                        <button class="del-btn" (click)="removeExercise(day, ex.id)">✕</button>
                      </div>
                    }
                  </div>

                  <div class="mt-16">
                    <div class="row gap-8">
                      <select [(ngModel)]="newExerciseLibId[day.day_of_week]" style="flex:1.6; background:var(--surface-2); border:1px solid var(--border); color:var(--text); border-radius:10px; padding:10px;">
                        <option [ngValue]="null">اختر من القائمة (اختياري)</option>
                        @for (lib of library(); track lib.id) {
                          <option [ngValue]="lib.id">{{ lib.category }} — {{ lib.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="row gap-8 mt-8">
                      <input type="text" placeholder="أو اكتب اسم تمرين جديد" [(ngModel)]="newExerciseName[day.day_of_week]" style="flex:1.6;" class="plain-input" />
                      <button class="btn btn-outline btn-sm" (click)="addExercise(day)">إضافة</button>
                    </div>
                  </div>
                } @else {
                  <p class="muted" style="font-size:13px;">هذا يوم راحة، فعّل المفتاح بالأعلى لو تبي تتمرن فيه</p>
                }
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .switch {
      width: 42px; height: 24px; border-radius: 12px; background: var(--surface-2);
      border: 1px solid var(--border); position: relative; flex: none;
    }
    .switch .knob {
      width: 18px; height: 18px; border-radius: 50%; background: var(--text-muted);
      position: absolute; top: 2px; right: 3px; transition: transform 0.15s ease;
    }
    .switch.on { background: var(--accent-dim); border-color: var(--accent); }
    .switch.on .knob { background: var(--accent); transform: translateX(-18px); }
    .ex-row { display:flex; align-items:center; gap:6px; }
    .ex-name {
      flex: 1.6; background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
      border-radius: 8px; padding: 8px 10px; font-size: 13.5px;
    }
    .ex-num {
      width: 44px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
      border-radius: 8px; padding: 8px 4px; text-align: center; font-weight: 700; font-size: 13px;
    }
    .del-btn { background:none; border:none; color:#FF6B6B; font-size:15px; flex:none; padding:4px 6px; }
    .plain-input {
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
      border-radius: 10px; padding: 10px 12px; font-size: 13.5px;
    }
  `],
})
export class ScheduleBuilderComponent implements OnInit {
  loading = signal(true);
  days = signal<ScheduleDay[]>([]);
  library = signal<LibraryExercise[]>([]);
  expanded = signal<number | null>(null);
  showTemplates = signal(false);

  newExerciseLibId: Record<number, number | null> = {};
  newExerciseName: Record<number, string> = {};

  cardioMachines = CARDIO_MACHINES;
  templates = TEMPLATES;

  constructor(private api: ApiService) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const [sched, lib] = await Promise.all([this.api.getSchedule(), this.api.getLibrary()]);
      this.days.set(sched.days);
      this.library.set(lib);
    } finally {
      this.loading.set(false);
    }
  }

  toggleExpand(dow: number) {
    this.expanded.set(this.expanded() === dow ? null : dow);
  }

  async quickToggleGym(day: ScheduleDay, event: Event) {
    event.stopPropagation();
    day.is_gym_day = !day.is_gym_day;
    await this.saveDayMeta(day);
  }

  async saveDayMeta(day: ScheduleDay) {
    const res = await this.api.updateDay(day.day_of_week, {
      is_gym_day: day.is_gym_day,
      label: day.label,
      has_cardio: day.has_cardio,
      cardio_machine: day.cardio_machine,
      cardio_minutes: day.cardio_minutes,
    });
    this.days.set(res.days);
  }

  async saveExercise(ex: any) {
    await this.api.updateExercise(ex.id, {
      name: ex.name,
      target_sets: ex.target_sets,
      target_reps: ex.target_reps,
    });
  }

  async removeExercise(day: ScheduleDay, exerciseId: number) {
    await this.api.deleteExercise(exerciseId);
    day.exercises = day.exercises.filter((e) => e.id !== exerciseId);
  }

  async addExercise(day: ScheduleDay) {
    const libId = this.newExerciseLibId[day.day_of_week];
    const customName = this.newExerciseName[day.day_of_week]?.trim();
    const libExercise = libId ? this.library().find((l) => l.id === libId) : null;
    const name = libExercise?.name || customName;
    if (!name) return;

    const ex = await this.api.addExercise(day.day_of_week, { name, target_sets: 3, target_reps: 10 });
    day.exercises = [...day.exercises, ex];
    this.newExerciseLibId[day.day_of_week] = null;
    this.newExerciseName[day.day_of_week] = '';
  }

  async applyTemplate(scheduleType: string) {
    const gymDays = this.days().filter((d) => d.is_gym_day).map((d) => d.day_of_week);
    if (gymDays.length === 0) {
      alert('حدد أيام النادي أولًا (فعّل المفتاح على أي يوم) قبل تطبيق القالب');
      return;
    }
    const res = await this.api.applyTemplate(gymDays, scheduleType);
    this.days.set(res.days);
    this.showTemplates.set(false);
  }
}
