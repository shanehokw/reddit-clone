import DataLoader from "dataloader";
import { User } from "../entities/User";

// keys: [1, 7, 8, 9]
// return user object for each userId in keys: [{id: 1, username: "bob"}, {}, {}, {}]
export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds) => {
    const users = await User.findByIds(userIds as number[]);
    const userIdToUser: Record<number, User> = {};
    users.forEach((u) => {
      userIdToUser[u.id] = u;
    });

    // for every userId, grab the user from the map
    const sortedUsers = userIds.map((userId) => userIdToUser[userId]);
    return sortedUsers;
  });
