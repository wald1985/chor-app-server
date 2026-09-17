export interface LibraryUnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export const LIBRARY_UNIT_OF_WORK = Symbol('LIBRARY_UNIT_OF_WORK');
