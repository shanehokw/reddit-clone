import { Request, Response } from "express";
import { SessionData } from "express-session";
import { Redis } from "ioredis";
import { createUpvoteLoader } from "./utils/createUpvoteLoader";
import { createUserLoader } from "./utils/createUserLoader";

export type MyContext = {
  req: Request & { session: Partial<SessionData> & { userId?: number } };
  redis: Redis;
  res: Response;
  userLoader: ReturnType<typeof createUserLoader>;
  upvoteLoader: ReturnType<typeof createUpvoteLoader>;
};
