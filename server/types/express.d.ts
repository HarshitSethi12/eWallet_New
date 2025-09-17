// Type augmentations for Express to add session and user properties

import 'express-session';

declare global {
  namespace Express {
    interface Request {
      session?: {
        user?: {
          id?: number | string;
          sub?: number | string;
        };
      };
      user?: {
        id: number | string;
      };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    user?: {
      id?: number | string;
      sub?: number | string;
    };
  }
}