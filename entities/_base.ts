export interface BaseStatic {
  create: (data: any) => Promise<BaseEntity>;
  save: () => Promise<void>;
}

export abstract class BaseEntity {}
