import { Component, OnInit, signal } from '@angular/core';
import { ApiService, WeekDay } from '../../core/services/api.service';

const R = 60;
const CIRC = 2 * Math.PI * R;

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

interface RingSegment {
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface HeatCell {
  date: string | null;
  calories: number;
  level: number; // 0..3
  attended: boolean;
}

interface MonthLabel {
  col: number;
  name: string;
}

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [],
  template: `
    <div class="page">
      <h1 style="font-size:24px;">سجل حضوري</h1>

      <!-- إحصائيات سريعة -->
      <div class="stats-row mt-16">
        <div class="stat-card">
          <div class="stat-num">{{ stats() ? stats()!.month_count : '—' }}</div>
          <div class="stat-label">هذا الشهر</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats() ? stats()!.year_count : '—' }}</div>
          <div class="stat-label">هذي السنة</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats() ? stats()!.total_count : '—' }}</div>
          <div class="stat-label">الإجمالي</div>
        </div>
      </div>

      <!-- التنقّل بين الأسابيع -->
      <div class="week-nav mt-24">
        <button class="nav-btn" (click)="prevWeek()" aria-label="الأسبوع السابق">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="week-title">
          <div style="font-weight:800;">{{ weekLabel() }}</div>
          <div class="muted" style="font-size:12px;">{{ attendedCount() }} من {{ gymDaysCount() }} أيام حضرتها</div>
        </div>
        <button class="nav-btn" (click)="nextWeek()" [disabled]="weeksAgo() === 0" aria-label="الأسبوع التالي">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>

      @if (loadingWeek()) {
        <div class="center-col" style="padding-top:30px;"><span class="spinner"></span></div>
      } @else {
        <div class="center-col mt-16">
          <svg width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" [attr.r]="R" fill="none" stroke="var(--border)" stroke-width="12" />
            @for (seg of segments(); track $index) {
              <circle cx="75" cy="75" [attr.r]="R" fill="none" [attr.stroke]="seg.color" stroke-width="12"
                      [attr.stroke-dasharray]="seg.dashArray" [attr.stroke-dashoffset]="seg.dashOffset"
                      stroke-linecap="round" transform="rotate(-90 75 75)" />
            }
            <text x="75" y="70" text-anchor="middle" font-size="26" font-weight="900" fill="var(--text)" class="ring-num">{{ attendedCount() }}</text>
            <text x="75" y="90" text-anchor="middle" font-size="11" fill="var(--text-muted)">من {{ gymDaysCount() }} أيام</text>
          </svg>
        </div>

        <div class="mt-16" style="display:flex; flex-direction:column; gap:8px;">
          @for (d of week(); track d.date) {
            <div class="card" style="padding:12px 14px;" [style.borderColor]="d.is_today ? 'var(--accent)' : 'var(--border)'">
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

      <!-- التقويم السنوي -->
      <div class="row-between mt-24" style="margin-bottom:12px;">
        <h2 style="font-size:18px;">تقويم السنة</h2>
        @if (stats()) {
          <select class="year-select" [value]="selectedYear()" (change)="onYearChange($event)">
            @for (y of stats()!.years; track y) {
              <option [value]="y">{{ y }}</option>
            }
          </select>
        }
      </div>

      @if (loadingStats()) {
        <div class="center-col" style="padding:20px;"><span class="spinner"></span></div>
      } @else if (stats()) {
        <div class="card" style="padding:14px;">
          <div class="heatmap-scroll">
            <div class="heatmap">
              @if (monthLabels().length) {
                <div class="month-row">
                  @for (lbl of monthLabels(); track $index) {
                    <span class="month-label" [style.gridColumnStart]="lbl.col + 1">{{ lbl.name }}</span>
                  }
                </div>
              }
              <div class="grid">
                @for (wk of weeks(); track $index) {
                  <div class="wk-col">
                    @for (cell of wk; track $index) {
                      <div class="heat-cell" [attr.data-level]="cell.level"
                           [class.empty]="!cell.date"
                           [title]="cell.date ? (cell.date + (cell.attended ? ' · ' + cell.calories + ' سعرة' : '')) : ''"></div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
          <div class="row gap-8 mt-16" style="justify-content:flex-end; font-size:11px; color:var(--text-muted);">
            <span>أقل</span>
            <span class="heat-cell" data-level="0"></span>
            <span class="heat-cell" data-level="1"></span>
            <span class="heat-cell" data-level="2"></span>
            <span class="heat-cell" data-level="3"></span>
            <span>أكثر</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ring-num { direction: ltr; }
    .stats-row { display: flex; gap: 8px; }
    .stat-card {
      flex: 1; background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 14px 8px; text-align: center;
    }
    .stat-num {
      font-size: 26px; font-weight: 900; color: var(--accent);
      font-variant-numeric: tabular-nums; direction: ltr;
    }
    .stat-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    .week-nav {
      display: flex; align-items: center; justify-content: space-between;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 8px 10px;
    }
    .week-title { text-align: center; }
    .nav-btn {
      width: 38px; height: 38px; border-radius: 10px; flex: none;
      background: var(--surface-2); border: 1px solid var(--border);
      color: var(--text); display: flex; align-items: center; justify-content: center;
    }
    .nav-btn:disabled { opacity: 0.35; }

    .day-dot { width: 10px; height:10px; border-radius:50%; background: var(--border); flex:none; }
    .day-dot.rest { background: transparent; border: 1.5px dashed var(--text-muted); }
    .day-dot.attended { background: var(--success); }

    .year-select {
      background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
      border-radius: 10px; padding: 8px 12px; font-weight: 700; font-family: inherit;
    }
    .heatmap-scroll { overflow-x: auto; direction: ltr; padding-bottom: 4px; }
    .heatmap { display: inline-block; }
    .grid { display: flex; gap: 3px; }
    .wk-col { display: flex; flex-direction: column; gap: 3px; }
    .month-row {
      display: grid; grid-auto-flow: column; gap: 3px;
      grid-auto-columns: 13px; margin-bottom: 4px; height: 14px;
    }
    .month-label { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
    .heat-cell {
      width: 13px; height: 13px; border-radius: 3px; background: var(--surface-2);
      display: inline-block;
    }
    .heat-cell.empty { background: transparent; }
    .heat-cell[data-level="1"] { background: #1d4d3a; }
    .heat-cell[data-level="2"] { background: #23916b; }
    .heat-cell[data-level="3"] { background: var(--success); }
  `],
})
export class TimesheetComponent implements OnInit {
  loadingWeek = signal(true);
  loadingStats = signal(true);

  week = signal<WeekDay[]>([]);
  gymDaysCount = signal(0);
  attendedCount = signal(0);
  segments = signal<RingSegment[]>([]);
  weeksAgo = signal(0);
  weekLabel = signal('هذا الأسبوع');

  stats = signal<import('../../core/services/api.service').StatsResponse | null>(null);
  selectedYear = signal<number>(new Date().getFullYear());
  weeks = signal<HeatCell[][]>([]);
  monthLabels = signal<MonthLabel[]>([]);

  R = R;

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await Promise.all([this.loadWeek(), this.loadStats(this.selectedYear())]);
  }

  async loadWeek() {
    this.loadingWeek.set(true);
    try {
      const res = await this.api.getWeek(this.weeksAgo());
      this.week.set(res.week);
      this.gymDaysCount.set(res.gym_days_count);
      this.attendedCount.set(res.attended_count);
      this.weekLabel.set(
        res.is_current_week
          ? 'هذا الأسبوع'
          : `${this.fmt(res.week_start)} — ${this.fmt(res.week_end)}`
      );
      this.buildRing(res.week);
    } finally {
      this.loadingWeek.set(false);
    }
  }

  async loadStats(year: number) {
    this.loadingStats.set(true);
    try {
      const res = await this.api.getStats(year);
      this.stats.set(res);
      this.selectedYear.set(res.year);
      this.buildHeatmap(res.year, res.days);
    } finally {
      this.loadingStats.set(false);
    }
  }

  prevWeek() {
    this.weeksAgo.update((w) => w + 1);
    this.loadWeek();
  }

  nextWeek() {
    if (this.weeksAgo() === 0) return;
    this.weeksAgo.update((w) => Math.max(0, w - 1));
    this.loadWeek();
  }

  onYearChange(event: Event) {
    const year = Number((event.target as HTMLSelectElement).value);
    this.loadStats(year);
  }

  private fmt(dateStr: string): string {
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
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

  private levelFor(calories: number): number {
    if (calories >= 300) return 3;
    if (calories >= 150) return 2;
    return 1; // حضر حتى لو السعرات قليلة/غير محسوبة
  }

  private buildHeatmap(year: number, days: Record<string, number>) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    const firstDow = start.getDay(); // 0=الأحد

    const flat: HeatCell[] = [];
    // خلايا فاضية قبل 1 يناير لتكملة عمود الأسبوع الأول
    for (let i = 0; i < firstDow; i++) {
      flat.push({ date: null, calories: 0, level: 0, attended: false });
    }
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr =
        `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const attended = Object.prototype.hasOwnProperty.call(days, dateStr);
      const calories = attended ? days[dateStr] : 0;
      flat.push({
        date: dateStr,
        calories,
        level: attended ? this.levelFor(calories) : 0,
        attended,
      });
      cur.setDate(cur.getDate() + 1);
    }

    // قسّم لأعمدة (كل عمود أسبوع = 7 خلايا)
    const weeks: HeatCell[][] = [];
    for (let i = 0; i < flat.length; i += 7) {
      const col = flat.slice(i, i + 7);
      while (col.length < 7) col.push({ date: null, calories: 0, level: 0, attended: false });
      weeks.push(col);
    }

    // عناوين الأشهر فوق الأعمدة
    const labels: MonthLabel[] = [];
    let lastMonth = -1;
    weeks.forEach((col, idx) => {
      const firstReal = col.find((c) => c.date);
      if (!firstReal || !firstReal.date) return;
      const month = Number(firstReal.date.split('-')[1]) - 1;
      if (month !== lastMonth) {
        labels.push({ col: idx, name: MONTHS_AR[month] });
        lastMonth = month;
      }
    });

    this.weeks.set(weeks);
    this.monthLabels.set(labels);
  }
}
