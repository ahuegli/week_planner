import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MealPrepTemplateDragData } from '../../core/models/drag-data.model';
import { MealPrepSession } from '../../core/models/mealprep.model';

@Component({
  selector: 'app-mealprep-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, CdkDropList, CdkDrag],
  templateUrl: './mealprep-manager.component.html',
  styleUrl: './mealprep-manager.component.scss',
})
export class MealPrepManagerComponent {
  @Input() mealPrepSessions: MealPrepSession[] = [];
  @Input() dayDropListIds: string[] = [];
  @Output() addMealPrepSession = new EventEmitter<{
    name: string;
    duration: number;
    frequencyPerWeek: number;
    daysPreppedFor: number;
  }>();
  @Output() deleteMealPrepSession = new EventEmitter<string>();

  showForm = signal(false);
  formData = signal({
    name: '',
    duration: 90,
    frequencyPerWeek: 2,
    daysPreppedFor: 3,
  });

  onToggleForm(): void {
    this.showForm.update((v) => !v);
    if (!this.showForm()) {
      this.resetForm();
    }
  }

  onAddMealPrepSession(): void {
    const data = this.formData();
    if (!data.name.trim() || data.duration <= 0 || data.frequencyPerWeek <= 0 || data.daysPreppedFor <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    this.addMealPrepSession.emit({
      name: data.name.trim(),
      duration: data.duration,
      frequencyPerWeek: data.frequencyPerWeek,
      daysPreppedFor: data.daysPreppedFor,
    });

    this.resetForm();
    this.showForm.set(false);
  }

  onDeleteMealPrepSession(id: string): void {
    this.deleteMealPrepSession.emit(id);
  }

  createDragData(session: MealPrepSession): MealPrepTemplateDragData {
    return { kind: 'mealprep-template', duration: session.duration };
  }

  private resetForm(): void {
    this.formData.set({
      name: '',
      duration: 90,
      frequencyPerWeek: 2,
      daysPreppedFor: 3,
    });
  }
}
