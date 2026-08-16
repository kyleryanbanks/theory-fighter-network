import { Component, effect, inject, signal } from '@angular/core';
import {
  FormField,
  form,
  min,
  readonly,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  type Input,
  type Inputs,
  LocalGuideFacadeStore,
} from '@theory-fighter-network/data';

interface GameFormModel {
  name: string;
  version: string;
  frameRate: number;
  is3d: boolean;
  teamSize: number;
  inputs: Inputs;
}

interface InputDraftModel {
  label: string;
  value: string;
}

@Component({
  selector: 'tfn-game-root',
  imports: [
    FormField,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './game-root.html',
  styleUrl: './game-root.css',
})
export class GameRoot {
  readonly facade = inject(LocalGuideFacadeStore);
  readonly gameModel = signal<GameFormModel>({
    name: 'Theory Fighter Network',
    version: '1.0.0',
    frameRate: 60,
    is3d: false,
    teamSize: 1,
    inputs: { directions: [], buttons: [] },
  });
  readonly directionDraftModel = signal<InputDraftModel>({
    label: '',
    value: '',
  });
  readonly buttonDraftModel = signal<InputDraftModel>({
    label: '',
    value: '',
  });
  readonly vocabularyError = signal('');

  readonly gameForm = form(this.gameModel, (path) => {
    required(path.name, { message: 'Game name is required.' });
    required(path.version, { message: 'Version is required.' });
    min(path.frameRate, 1, { message: 'Frame rate must be positive.' });
    min(path.teamSize, 1, { message: 'Team size must be at least one.' });
    readonly(path.name, { when: () => !!this.facade.guide() });
    readonly(path.version, { when: () => !!this.facade.guide() });
  });
  readonly directionDraftForm = form(this.directionDraftModel);
  readonly buttonDraftForm = form(this.buttonDraftModel);

  constructor() {
    effect(() => {
      const game = this.facade.guide()?.entities.game;
      if (!game?.config) {
        return;
      }

      this.gameModel.set({
        name: game.name,
        version: game.version,
        frameRate: game.config.frameRate ?? 60,
        is3d: game.config.is3d,
        teamSize: game.config.teamSize,
        inputs: {
          directions: game.config.inputs.directions.map((input) => ({ ...input })),
          buttons: game.config.inputs.buttons.map((input) => ({ ...input })),
        },
      });
    });
  }

  createGuide(): void {
    submit(this.gameForm, async () => {
      const model = this.gameModel();
      await this.facade.createGuide({
        name: model.name.trim(),
        version: model.version.trim(),
        frameRate: model.frameRate,
        is3d: model.is3d,
        teamSize: model.teamSize,
        inputs: cloneInputs(model.inputs),
      });
    });
  }

  updateActiveGame(): void {
    submit(this.gameForm, async () => {
      const model = this.gameModel();
      await this.facade.updateActiveGame({
        frameRate: model.frameRate,
        is3d: model.is3d,
        teamSize: model.teamSize,
        inputs: cloneInputs(model.inputs),
      });
    });
  }

  addDirection(): void {
    this.addInput('directions', this.directionDraftModel);
  }

  addButton(): void {
    this.addInput('buttons', this.buttonDraftModel);
  }

  removeDirection(index: number): void {
    this.removeInput('directions', index);
  }

  removeButton(index: number): void {
    this.removeInput('buttons', index);
  }

  private addInput(
    collection: 'directions' | 'buttons',
    draftModel: typeof this.directionDraftModel
  ): void {
    const label = draftModel().label.trim();
    const value = draftModel().value.trim();

    if (!label) {
      this.vocabularyError.set('Enter a label before adding an input.');
      return;
    }

    const normalizedValue = (value || label).toLowerCase();
    const allInputs = [
      ...this.gameModel().inputs.directions,
      ...this.gameModel().inputs.buttons,
    ];
    const isDuplicate = allInputs.some(
      (input) => (input.value ?? input.label).trim().toLowerCase() === normalizedValue
    );

    if (isDuplicate) {
      this.vocabularyError.set(`Input value "${value || label}" is already used.`);
      return;
    }

    const input: Input = value ? { label, value } : { label };
    this.gameModel.update((model) => ({
      ...model,
      inputs: {
        ...model.inputs,
        [collection]: [...model.inputs[collection], input],
      },
    }));
    draftModel.set({ label: '', value: '' });
    this.vocabularyError.set('');
  }

  private removeInput(
    collection: 'directions' | 'buttons',
    index: number
  ): void {
    this.gameModel.update((model) => ({
      ...model,
      inputs: {
        ...model.inputs,
        [collection]: model.inputs[collection].filter(
          (_input, inputIndex) => inputIndex !== index
        ),
      },
    }));
    this.vocabularyError.set('');
  }
}

function cloneInputs(inputs: Inputs): Inputs {
  return {
    directions: inputs.directions.map(cloneInput),
    buttons: inputs.buttons.map(cloneInput),
  };
}

function cloneInput(input: Input): Input {
  return {
    label: input.label,
    ...(input.value === undefined ? {} : { value: input.value }),
    ...(input.min === undefined ? {} : { min: input.min }),
    ...(input.max === undefined ? {} : { max: input.max }),
  };
}