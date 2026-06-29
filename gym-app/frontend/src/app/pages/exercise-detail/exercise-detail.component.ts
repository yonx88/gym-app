import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService, Exercise } from '../../core/services/api.service';

@Component({
  selector: 'app-exercise-detail',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <button class="btn-back" (click)="back()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        رجوع
      </button>

      @if (loading()) {
        <div class="center-col" style="padding-top:80px;"><span class="spinner"></span></div>
      } @else if (exercise()) {
        <h1 class="mt-16" style="font-size:22px;">{{ exercise()!.name }}</h1>

        <div class="photo-box mt-16" (click)="fileInput.click()">
          @if (exercise()!.image_path) {
            <img [src]="imgUrl(exercise()!.image_path)" />
          } @else {
            <div class="center-col" style="color:var(--text-muted);">
              <span style="font-size:30px;">📷</span>
              <span style="font-size:13px; margin-top:6px;">اضغط لإضافة صورتك للتمرين</span>
            </div>
          }
          @if (uploading()) {
            <div class="photo-overlay"><span class="spinner"></span></div>
          }
        </div>
        <input #fileInput type="file" accept="image/*" capture="environment" hidden (change)="onFile($event)" />

        @if (exercise()!.last_log) {
          <div class="card mt-16">
            <div class="muted" style="font-size:12.5px; margin-bottom:6px;">آخر مرة سويت هذا التمرين</div>
            <div class="row gap-12">
              <div><span class="num" style="font-size:18px;">{{ exercise()!.last_log!.weight_kg || 0 }}</span> <span class="muted" style="font-size:12px;">كجم</span></div>
              <div><span class="num" style="font-size:18px;">{{ exercise()!.last_log!.sets_done || exercise()!.target_sets }}</span> <span class="muted" style="font-size:12px;">جولات</span></div>
              <div><span class="num" style="font-size:18px;">{{ exercise()!.last_log!.reps_done || exercise()!.target_reps }}</span> <span class="muted" style="font-size:12px;">تكرار</span></div>
            </div>
          </div>
        }

        <div class="card mt-16">
          <div class="muted" style="font-size:12.5px; margin-bottom:10px;">تمارين اليوم</div>
          <div class="field">
            <label>الوزن (كجم)</label>
            <input type="number" [(ngModel)]="weight" />
          </div>
          <div class="row gap-8">
            <div class="field" style="flex:1;">
              <label>عدد الجولات</label>
              <input type="number" [(ngModel)]="sets" />
            </div>
            <div class="field" style="flex:1;">
              <label>عدد التكرارات</label>
              <input type="number" [(ngModel)]="reps" />
            </div>
          </div>

          <button class="btn" [class.btn-success]="checked" [class.btn-outline]="!checked" (click)="checked = !checked">
            {{ checked ? '✓ تم هذا التمرين' : 'حدد إذا خلصته' }}
          </button>
          <button class="btn btn-primary mt-8" [disabled]="saving()" (click)="save()">
            @if (saving()) { <span class="spinner"></span> } @else { حفظ }
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .btn-back {
      display:flex; align-items:center; gap:6px; background:none; border:none;
      color: var(--text-muted); font-weight:700; padding:0; font-size:14px;
    }
    .photo-box {
      width:100%; height:200px; border-radius: var(--radius);
      background: var(--surface-2); border: 1px solid var(--border);
      display:flex; align-items:center; justify-content:center; overflow:hidden;
      position: relative;
    }
    .photo-box img { width:100%; height:100%; object-fit:cover; }
    .photo-overlay {
      position:absolute; inset:0; background:rgba(0,0,0,0.5);
      display:flex; align-items:center; justify-content:center;
    }
  `],
})
export class ExerciseDetailComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  uploading = signal(false);
  exercise = signal<Exercise | null>(null);

  weight: number | null = null;
  sets = 3;
  reps = 10;
  checked = false;

  private exerciseId!: number;

  constructor(private route: ActivatedRoute, private router: Router, private api: ApiService) {}

  async ngOnInit() {
    this.exerciseId = Number(this.route.snapshot.paramMap.get('id'));
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const today = await this.api.getToday();
      const ex = (today.exercises || []).find((e) => e.id === this.exerciseId) || null;
      this.exercise.set(ex);
      if (ex) {
        this.weight = ex.today_log?.weight_kg ?? ex.last_log?.weight_kg ?? null;
        this.sets = ex.today_log?.sets_done ?? ex.target_sets;
        this.reps = ex.today_log?.reps_done ?? ex.last_log?.reps_done ?? ex.target_reps;
        this.checked = !!ex.today_log?.is_checked;
      }
    } finally {
      this.loading.set(false);
    }
  }

  imgUrl(path: string | null) {
    return this.api.imageUrl(path);
  }

  back() {
    this.router.navigateByUrl('/home');
  }

  async onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    try {
      const res = await this.api.uploadExerciseImage(this.exerciseId, file);
      this.exercise.update((ex) => (ex ? { ...ex, image_path: res.image_path } : ex));
    } finally {
      this.uploading.set(false);
    }
  }

  async save() {
    this.saving.set(true);
    try {
      await this.api.logExercise({
        exercise_id: this.exerciseId,
        weight_kg: this.weight ?? undefined,
        sets_done: this.sets,
        reps_done: this.reps,
        is_checked: this.checked,
      });
      this.router.navigateByUrl('/home');
    } finally {
      this.saving.set(false);
    }
  }
}
