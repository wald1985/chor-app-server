export interface IdGenerator {
  generateId(): string;
}

export const ID_GENERATOR = Symbol('ID_GENERATOR');
