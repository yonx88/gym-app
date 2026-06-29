import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { BottomNavComponent } from './shared/components/bottom-nav.component';

const NO_NAV_PREFIXES = ['/login', '/register', '/onboarding'];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  template: `
    <div class="app-shell">
      <router-outlet></router-outlet>
      @if (showNav()) {
        <app-bottom-nav></app-bottom-nav>
      }
    </div>
  `,
})
export class AppComponent {
  showNav = signal(false);

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.showNav.set(!NO_NAV_PREFIXES.some((p) => event.urlAfterRedirects.startsWith(p)));
      }
    });
  }
}
