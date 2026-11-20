import type { User } from '@aorta-iq/shared';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
