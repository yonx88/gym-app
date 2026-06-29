import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../config';

export interface AuthUser {
  id: number;
  email: string;
  onboarded: boolean;
}

const TOKEN_KEY = 'gym_token';
const USER_KEY = 'gym_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<AuthUser | null>(this.readStoredUser());

  constructor(private http: HttpClient, private router: Router) {}

  private readStoredUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
      })
    );
    this.persistSession(res.token, res.user);
    return res.user;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const res = await firstValueFrom(
      this.http.post<{ token: string; user: AuthUser }>(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      })
    );
    this.persistSession(res.token, res.user);
    return res.user;
  }

  private persistSession(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  markOnboarded() {
    const u = this.currentUser();
    if (u) {
      const updated = { ...u, onboarded: true };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      this.currentUser.set(updated);
    }
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigateByUrl('/login');
  }
}
