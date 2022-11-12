import type { uuid } from '@types/uuid'

export type Message = {
  body: {
    title: string;
    message: string;
    created_at: number;
  }
}