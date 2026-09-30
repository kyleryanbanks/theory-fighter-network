import { rxMutation, withMutations } from '@angular-architects/ngrx-toolkit';
import { computed } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withState,
} from '@ngrx/signals';
import { nanoid } from 'nanoid';
import { from, of } from 'rxjs';
import type {
  EntityRef,
  GuideTodo,
  TodoTracking,
  TfnWorkspace,
} from '../../guide/guide.types';

type TodoStoreState = {
  todos: GuideTodo[];
  dirty: boolean;
};

/**
 * Persisted user todos, synced with .tfn file and independent of guide entities.
 */
export const TodoStore = signalStore(
  { providedIn: 'root' },
  withState<TodoStoreState>({
    todos: [],
    dirty: false,
  }),
  withMutations((store) => ({
    create: rxMutation({
      operation: (
        text: string,
        entityRefsOrTracking?: EntityRef[] | TodoTracking,
        tracking?: TodoTracking,
      ) => {
        const entityRefs = Array.isArray(entityRefsOrTracking)
          ? entityRefsOrTracking
          : undefined;
        const trackingValue = Array.isArray(entityRefsOrTracking)
          ? tracking
          : entityRefsOrTracking;
        return of({
          id: nanoid(),
          text: text.trim(),
          status: 'open' as const,
          entityRefs,
          tracking: trackingValue,
          createdAt: new Date(),
        });
      },
      onSuccess: (todo) => {
        patchState(store, (state) => ({
          todos: [...state.todos, todo],
          dirty: true,
        }));
      },
    }),

    createTracked: rxMutation({
      operation: (input: {
        text: string;
        tracking: TodoTracking;
        tracker?: GuideTodo['tracker'];
      }) =>
        of({
          id: nanoid(),
          text: input.text.trim(),
          status: 'open' as const,
          tracking: input.tracking,
          tracker: input.tracker,
          createdAt: new Date(),
        }),
      onSuccess: (todo: GuideTodo) => {
        patchState(store, (state) => ({
          todos: [...state.todos, todo],
          dirty: true,
        }));
      },
    }),

    updateText: rxMutation({
      operation: ((todoId: string, text: string) =>
        from(
          (async () => {
            const todo = store.todos().find((t) => t.id === todoId);
            if (!todo) {
              throw new Error(`Todo "${todoId}" not found.`);
            }
            return { ...todo, text: text.trim() };
          })(),
        )) as any,
      onSuccess: (updated) => {
        patchState(store, (state) => ({
          todos: state.todos.map((t) => (t.id === updated.id ? updated : t)),
          dirty: true,
        }));
      },
    }),

    setLinks: rxMutation({
      operation: (todoId: string, entityRefs?: EntityRef[]) =>
        from(
          (async () => {
            const todo = store.todos().find((t) => t.id === todoId);
            if (!todo) {
              throw new Error(`Todo "${todoId}" not found.`);
            }
            return { ...todo, entityRefs };
          })(),
        ),
      onSuccess: (updated) => {
        patchState(store, (state) => ({
          todos: state.todos.map((t) => (t.id === updated.id ? updated : t)),
          dirty: true,
        }));
      },
    }),

    complete: rxMutation({
      operation: (todoId: string) =>
        from(
          (async () => {
            const todo = store.todos().find((t) => t.id === todoId);
            if (!todo) {
              throw new Error(`Todo "${todoId}" not found.`);
            }
            return {
              ...todo,
              status: 'done' as const,
              completedAt: new Date(),
            };
          })(),
        ),
      onSuccess: (updated) => {
        patchState(store, (state) => ({
          todos: state.todos.map((t) => (t.id === updated.id ? updated : t)),
          dirty: true,
        }));
      },
    }),

    reopen: rxMutation({
      operation: (todoId: string) =>
        from(
          (async () => {
            const todo = store.todos().find((t) => t.id === todoId);
            if (!todo) {
              throw new Error(`Todo "${todoId}" not found.`);
            }
            return { ...todo, status: 'open' as const, completedAt: undefined };
          })(),
        ),
      onSuccess: (updated) => {
        patchState(store, (state) => ({
          todos: state.todos.map((t) => (t.id === updated.id ? updated : t)),
          dirty: true,
        }));
      },
    }),

    delete: rxMutation({
      operation: (todoId: string) =>
        from(
          (async () => {
            if (!store.todos().find((t) => t.id === todoId)) {
              throw new Error(`Todo "${todoId}" not found.`);
            }
            return todoId;
          })(),
        ),
      onSuccess: (todoId) => {
        patchState(store, (state) => ({
          todos: state.todos.filter((t) => t.id !== todoId),
          dirty: true,
        }));
      },
    }),

    hydrate: rxMutation({
      operation: (workspace: TfnWorkspace) => of(workspace.todos),
      onSuccess: (todos) => {
        patchState(store, { todos, dirty: false });
      },
    }),

    reset: rxMutation({
      operation: () => of(void 0),
      onSuccess: () => {
        patchState(store, { todos: [], dirty: false });
      },
    }),

    markClean: rxMutation({
      operation: () => of(void 0),
      onSuccess: () => {
        patchState(store, { dirty: false });
      },
    }),
  })),
  withComputed((store) => ({
    openTodos: computed(() => store.todos().filter((t) => t.status === 'open')),
    doneTodos: computed(() => store.todos().filter((t) => t.status === 'done')),
    todosFor: computed(() => {
      return (ref: EntityRef) =>
        store
          .todos()
          .filter((t) =>
            t.entityRefs?.some(
              (r) =>
                r.entityType === ref.entityType &&
                r.entityKey === ref.entityKey,
            ),
          );
    }),
  })),
);
