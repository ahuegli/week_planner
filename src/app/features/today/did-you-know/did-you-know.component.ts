import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DidYouKnow } from '../../../mock-data';

@Component({
  selector: 'app-did-you-know',
  standalone: true,
  templateUrl: './did-you-know.component.html',
  styleUrl: './did-you-know.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DidYouKnowComponent {
  readonly card = input.required<DidYouKnow>();
}
