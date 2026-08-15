# data

This library was generated with [Nx](https://nx.dev).

## Architecture

This library is the primary data boundary for the application.

- Models: domain documents and schema helpers under `src/lib/models`.
- Persistence adapters: browser and node persistence helpers under `src/lib/persistence` and `src/lib/utils`.
- Facades: SignalStore-based orchestration under `src/lib/facades`.

### Facade pattern

The preferred pattern in this codebase is:

- `withResource` for read lifecycle and loading state.
- `withMutations` and `rxMutation` for write commands.
- `withComputed` for derived view state consumed by feature components.

Feature code should consume exported facades from this library rather than
calling persistence adapters directly.

## Running unit tests

Run `nx test data` to execute the unit tests.
