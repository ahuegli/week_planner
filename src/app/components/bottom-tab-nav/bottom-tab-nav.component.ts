import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { cycleTrackingEnabled } from '../../shared/state/cycle-ui.state';
import { DataStoreService } from '../../core/services/data-store.service';

@Component({
  selector: 'app-bottom-tab-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-tab-nav.component.html',
  styleUrl: './bottom-tab-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomTabNavComponent {
  private readonly dataStore = inject(DataStoreService);
  protected readonly cycleTrackingEnabled = cycleTrackingEnabled;
  protected readonly hasPendingInvitations = computed(() => this.dataStore.pendingInvitations().length > 0);
}
