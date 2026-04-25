import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { cycleTrackingEnabled } from '../../shared/state/cycle-ui.state';

@Component({
  selector: 'app-bottom-tab-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-tab-nav.component.html',
  styleUrl: './bottom-tab-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomTabNavComponent {
  protected readonly cycleTrackingEnabled = cycleTrackingEnabled;
}
