import {
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export type GuideNavMode = 'expanded' | 'compact';

interface GuideNavItem {
  path: string;
  label: string;
  icon: string;
}

const STORAGE_KEY = 'tfn-guide-nav-mode';
const MODE_ORDER: GuideNavMode[] = ['expanded', 'compact'];
const MODE_TOGGLE_LABEL: Record<GuideNavMode, string> = {
  expanded: 'Collapse navigation to icons only',
  compact: 'Expand navigation',
};

const NAV_ITEMS: GuideNavItem[] = [
  { path: 'game', label: 'Game', icon: '🎮' },
  { path: 'stages', label: 'Stages', icon: '🗺️' },
  { path: 'characters', label: 'Characters', icon: '🥋' },
  { path: 'moves', label: 'Moves', icon: '👊' },
  { path: 'sequences', label: 'Sequences', icon: '🔗' },
  { path: 'teams', label: 'Teams', icon: '👥' },
];

@Component({
  selector: 'tfn-guide-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './guide-nav.html',
  styleUrl: './guide-nav.css',
})
export class GuideNav {
  private readonly platformId = inject(PLATFORM_ID);
  readonly items = NAV_ITEMS;
  readonly mode = signal<GuideNavMode>(this.restoreMode());
  readonly toggleLabel = computed(() => MODE_TOGGLE_LABEL[this.mode()]);

  cycleMode(): void {
    const nextIndex = (MODE_ORDER.indexOf(this.mode()) + 1) % MODE_ORDER.length;
    this.setMode(MODE_ORDER[nextIndex]);
  }

  private setMode(mode: GuideNavMode): void {
    this.mode.set(mode);
    if (isPlatformBrowser(this.platformId)) {
      globalThis.localStorage?.setItem(STORAGE_KEY, mode);
    }
  }

  private restoreMode(): GuideNavMode {
    if (!isPlatformBrowser(this.platformId)) {
      return 'expanded';
    }
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored && (MODE_ORDER as string[]).includes(stored)
      ? (stored as GuideNavMode)
      : 'expanded';
  }
}
