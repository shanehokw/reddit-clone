import DataLoader from "dataloader";
import { Upvote } from "../entities/Upvote";

// difference with upvote loader and user loader is upvote loader needs to know user id and post id, so the key is an object
// keys: [{postId: 5, userId: 10}}, {}, {}, {}]
// return upvote or null: [{postId: 5, userId: 10, value: 1}]
export const createUpvoteLoader = () =>
  new DataLoader<{ postId: number; userId: number }, Upvote | null>(
    async (keys) => {
      const upvotes = await Upvote.findByIds(keys as any);
      const upvoteIdsToUpvote: Record<string, Upvote> = {};
      upvotes.forEach((upvote) => {
        upvoteIdsToUpvote[`${upvote.userId}|${upvote.postId}`] = upvote;
      });

      return keys.map(
        (key) => upvoteIdsToUpvote[`${key.userId}|${key.postId}`]
      );
    }
  );
