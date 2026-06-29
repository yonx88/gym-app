import { Component, OnInit, signal } from '@angular/core';
import { ApiService, WeekDay } from '../../core/services/api.service';

const R = 70;
const CIRC = 2 * Math.PI * R;

interface RingSegment {
  color: string;
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [],
  template: `
    <div class="page">
      <h1 style="font-size:24px;">جدولي الأسبوعي</h1>
      <p class="muted mt-8">{{ attendedCount() }} من {{ gymDaysCount() }} أيام حضرتها هذا الأسبوع</p>

      @if (loading()) {
        <div class="center-col" style="padding-top:60px;"><span class="spinner"></span></div>
      } @else {
        <div class="center-col mt-24">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" [attr.r]="R" fill="none" stroke="var(--border)" stroke-width="14" />
            @for (seg of segments(); track $index) {
              <circle cx="90" cy="90" [attr.r]="R" fill="none" [attr.stroke]="seg.color" stroke-width="14"
                      [attr.stroke-dasharray]="seg.dashArray" [attr.stroke-dashoffset]="seg.dashOffset"
                      stroke-linecap="round" transform="rotate(-90 90 90)" />
            }
            <text x="90" y="84" text-anchor="middle" font-size="30" font-weight="900" fill="var(--text)" class="ring-num">{{ attendedCount() }}</text>
            <text x="90" y="106" text-anchor="middle" font-size="12" fill="var(--text-muted)">من {{ gymDaysCount() }} أيام</text>
          </svg>
        </div>

        <div class="mt-24" style="display:flex; flex-direction:column; gap:8px;">
          @for (d of week(); track d.date) {
            <div class="card" [style.borderColor]="d.is_today ? 'var(--accent)' : 'var(--border)'">
              <div class="row-between">
                <div class="row gap-12">
                  <div class="day-dot" [class.attended]="d.attended" [class.rest]="!d.is_gym_day"></div>
                  <div>
                    <div style="font-weight:700;">{{ d.day_name }}</div>
                    <div class="muted" style="font-size:12px; margin-top:2px;">
                      {{ d.is_gym_day ? d.label : 'يوم راحة' }}
                    </div>
                  </div>
                </div>
                <div style="text-align:left;">
                  @if (d.attended) {
                    <div class="chip" style="background:var(--success-dim); border-color:var(--success); color:var(--success); font-size:12px;">
                      حضرت · <span class="num">{{ d.calories }}</span> سعرة
                    </div>
                  } @else if (d.is_gym_day && !d.is_future) {
                    <div class="chip" style="font-size:12px; color:#FF8F70; border-color:#4a2424;">لم تحضر</div>
                  } @else if (d.is_gym_day && d.is_future) {
                    <div class="chip" style="font-size:12px;">قادم</div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ring-num { direction: ltr; }
    .day-dot {
      width: 10px; height:10px; border-radius:50%; background: var(--border); flex:none;
    }
    .day-dot.rest { background: transparent; border: 1.5px dashed var(--text-muted); }
    .day-dot.attended { background: var(--success); }
  `],
})
export class TimesheetComponent implements OnInit {
  loading = signal(true);
  week = signal<WeekDay[]>([]);
  gymDaysCount = signal(0);
  attendedCount = signal(0);
  segments = signal<RingSegment[]>([]);
  R = R;

  constructor(private api: ApiService) {}

  async ngOnInit() {
    this.loading.set(true);
    try {
      const res = await this.api.getWeek();
      this.week.set(res.week);
      this.gymDaysCount.set(res.gym_days_count);
      this.attendedCount.set(res.attended_count);
      this.buildRing(res.week);
    } finally {
      this.loading.set(false);
    }
  }

  private buildRing(week: WeekDay[]) {
    const gap = 6;
    const segLen = CIRC / 7 - gap;
    const segs: RingSegment[] = week.map((d, i) => {
      let color = 'var(--border)';
      if (d.attended) color = 'var(--success)';
      else if (d.is_gym_day && !d.is_future) color = '#5A2A2A';
      else if (!d.is_gym_day) color = 'transparent';
      return {
        color,
        dashArray: `${segLen} ${CIRC - segLen}`,
        dashOffset: -(i * (CIRC / 7)),
      };
    });
    this.segments.set(segs);
  }
}
