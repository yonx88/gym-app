import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config';

export interface Exercise {
  id: number;
  schedule_day_id: number;
  name: string;
  target_sets: number;
  target_reps: number;
  image_path: string | null;
  order_index: number;
  today_log?: ExerciseLog | null;
  last_log?: ExerciseLog | null;
}

export interface ExerciseLog {
  id: number;
  exercise_id: number;
  log_date: string;
  weight_kg: number | null;
  sets_done: number | null;
  reps_done: number | null;
  is_checked: number;
}

export interface ScheduleDay {
  id?: number;
  day_of_week: number;
  day_name: string;
  is_gym_day: boolean;
  label: string;
  has_cardio: boolean;
  cardio_machine: string | null;
  cardio_minutes: number | null;
  exercises: Exercise[];
}

export interface TodayWorkout {
  date: string;
  day_name: string;
  is_gym_day: boolean;
  label: string;
  has_cardio?: boolean;
  cardio_machine?: string | null;
  cardio_minutes?: number | null;
  exercises: Exercise[];
  is_completed: boolean;
  calories_today: number;
}

export interface WeekDay {
  date: string;
  day_of_week: number;
  day_name: string;
  is_gym_day: boolean;
  label: string;
  attended: boolean;
  calories: number;
  is_future: boolean;
  is_today: boolean;
}

export interface WeekResponse {
  week: WeekDay[];
  gym_days_count: number;
  attended_count: number;
  weeks_ago: number;
  week_start: string;
  week_end: string;
  is_current_week: boolean;
}

export interface StatsResponse {
  year: number;
  years: number[];
  month_count: number;
  year_count: number;
  total_count: number;
  days: Record<string, number>; // date -> calories
}

export interface Profile {
  id: number;
  email: string;
  height_cm: number | null;
  weight_kg: number | null;
  schedule_type: string;
  onboarded: number;
}

export interface LibraryExercise {
  id: number;
  name: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  // ---- Profile ----
  getProfile() {
    return firstValueFrom(this.http.get<Profile>(`${API_BASE_URL}/api/profile`));
  }
  updateProfile(data: { height_cm?: number; weight_kg?: number }) {
    return firstValueFrom(this.http.put<Profile>(`${API_BASE_URL}/api/profile`, data));
  }

  // ---- Schedule ----
  getSchedule() {
    return firstValueFrom(this.http.get<{ days: ScheduleDay[] }>(`${API_BASE_URL}/api/schedule`));
  }
  applyTemplate(gymDays: number[], scheduleType: string) {
    return firstValueFrom(
      this.http.post<{ days: ScheduleDay[] }>(`${API_BASE_URL}/api/schedule/template`, {
        gymDays,
        scheduleType,
      })
    );
  }
  updateDay(dayOfWeek: number, data: Partial<ScheduleDay>) {
    return firstValueFrom(
      this.http.put<{ days: ScheduleDay[] }>(`${API_BASE_URL}/api/schedule/day/${dayOfWeek}`, data)
    );
  }
  addExercise(dayOfWeek: number, data: { name: string; target_sets: number; target_reps: number }) {
    return firstValueFrom(
      this.http.post<Exercise>(`${API_BASE_URL}/api/schedule/day/${dayOfWeek}/exercises`, data)
    );
  }
  updateExercise(id: number, data: Partial<Exercise>) {
    return firstValueFrom(this.http.put<Exercise>(`${API_BASE_URL}/api/schedule/exercises/${id}`, data));
  }
  deleteExercise(id: number) {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/api/schedule/exercises/${id}`));
  }

  // ---- Library ----
  getLibrary(category?: string) {
    const url = category
      ? `${API_BASE_URL}/api/library?category=${encodeURIComponent(category)}`
      : `${API_BASE_URL}/api/library`;
    return firstValueFrom(this.http.get<LibraryExercise[]>(url));
  }

  // ---- Logs / today / attendance ----
  getToday() {
    return firstValueFrom(this.http.get<TodayWorkout>(`${API_BASE_URL}/api/logs/today`));
  }
  logExercise(data: {
    exercise_id: number;
    weight_kg?: number;
    sets_done?: number;
    reps_done?: number;
    is_checked?: boolean;
  }) {
    return firstValueFrom(this.http.post<ExerciseLog>(`${API_BASE_URL}/api/logs/exercise`, data));
  }
  uploadExerciseImage(exerciseId: number, file: File) {
    const form = new FormData();
    form.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_path: string }>(`${API_BASE_URL}/api/logs/exercise/${exerciseId}/image`, form)
    );
  }
  finishDay() {
    return firstValueFrom(
      this.http.post<{ date: string; calories_estimate: number; is_completed: boolean }>(
        `${API_BASE_URL}/api/logs/day-complete`,
        {}
      )
    );
  }
  undoFinishDay() {
    return firstValueFrom(this.http.delete(`${API_BASE_URL}/api/logs/day-complete`));
  }
  getWeek(weeksAgo = 0) {
    return firstValueFrom(
      this.http.get<WeekResponse>(`${API_BASE_URL}/api/logs/week?weeksAgo=${weeksAgo}`)
    );
  }
  getStats(year?: number) {
    const q = year ? `?year=${year}` : '';
    return firstValueFrom(this.http.get<StatsResponse>(`${API_BASE_URL}/api/logs/stats${q}`));
  }

  imageUrl(path: string | null): string {
    if (!path) return '';
    return `${API_BASE_URL}${path}`;
  }
}
