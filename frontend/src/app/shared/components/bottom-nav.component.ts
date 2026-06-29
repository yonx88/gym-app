import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bottom-nav">
      <a routerLink="/home" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 11.5 12 4l9 7.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M5 10v9h14v-9" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>اليوم</span>
      </a>
      <a routerLink="/timesheet" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" stroke-linecap="round" />
        </svg>
        <span>أسبوعي</span>
      </a>
      <a routerLink="/schedule" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h10" stroke-linecap="round" />
        </svg>
        <span>جدولي</span>
      </a>
      <a routerLink="/profile" routerLinkActive="active">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3.2-6 7-6s7 2.5 7 6" stroke-linecap="round" />
        </svg>
        <span>حسابي</span>
      </a>
    </nav>
  `,
})
export class BottomNavComponent {}
