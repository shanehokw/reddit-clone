"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUpvoteLoader = void 0;
const dataloader_1 = __importDefault(require("dataloader"));
const Upvote_1 = require("../entities/Upvote");
const createUpvoteLoader = () => new dataloader_1.default(async (keys) => {
    const upvotes = await Upvote_1.Upvote.findByIds(keys);
    const upvoteIdsToUpvote = {};
    upvotes.forEach((upvote) => {
        upvoteIdsToUpvote[`${upvote.userId}|${upvote.postId}`] = upvote;
    });
    return keys.map((key) => upvoteIdsToUpvote[`${key.userId}|${key.postId}`]);
});
exports.createUpvoteLoader = createUpvoteLoader;
//# sourceMappingURL=createUpvoteLoader.js.map