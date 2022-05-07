import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { getConnection } from "typeorm";
import { Upvote } from "../entities/Upvote";
import { User } from "../entities/User";

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];
  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() post: Post) {
    var snippet = post.text.slice(0, 100);
    if (post.text.length > 100) {
      snippet += "...";
    }

    return snippet;
  }

  @FieldResolver(() => User)
  creator(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(post.creatorId);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() post: Post,
    @Ctx() { upvoteLoader, req }: MyContext
  ) {
    if (!req.session.userId) {
      return null;
    }

    const upvote = await upvoteLoader.load({
      postId: post.id,
      userId: req.session.userId,
    });

    return upvote ? upvote.value : null;
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg("postId", () => Int) postId: number,
    @Arg("value", () => Int) value: number,
    @Ctx() { req }: MyContext
  ) {
    const isUpvote = value !== -1;
    const realValue = isUpvote ? 1 : -1;
    const { userId } = req.session;

    const upvote = await Upvote.findOne({ where: { postId, userId } });

    // the user has voted on the post before
    // and they are changing their vote
    if (upvote && upvote.value !== realValue) {
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          UPDATE upvote
          SET value = $1
          WHERE "postId" = $2 AND "userId" = $3`,
          [realValue, postId, userId]
        );
        await tm.query(
          `
          UPDATE post p
          SET points = points + $1
          WHERE id = $2`,
          [2 * realValue, postId] // 2* because we take away the original point and give it a new one
        );
      });
    } else if (!upvote) {
      // has never voted before
      await getConnection().transaction(async (tm) => {
        await tm.query(
          `
          INSERT INTO upvote ("userId", "postId", value)
          VALUES ($1, $2, $3)`,
          [userId, postId, realValue]
        );

        await tm.query(
          `
          UPDATE post
          SET points = points + $1
          WHERE id = $2`,
          [realValue, postId]
        );
      });
    }
    return true;
  }

  @Query(() => PaginatedPosts) //returns an array of Post, graphql syntax for array is [datatype], eg: int[] -> [int]
  async posts(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null,
    // we explicitly set the return type because nullable needs to be set,
    // because the first time post is fetched, there wont be a cursor
    @Ctx() {}: MyContext
  ): Promise<PaginatedPosts> {
    //typescript syntax for array is like normal

    // take +1 more than limit, eg: 20 -> 21, so if we get 21 posts, there are more posts to be shown,
    // if we get less than that, we know there isnt
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const replacements: any[] = [realLimitPlusOne];

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)));
    }

    const posts = await getConnection().query(
      `
    SELECT p.*
    FROM post p
    ${cursor ? `WHERE p."createdAt" < $2` : ""}
    ORDER BY p."createdAt" DESC
    LIMIT $1
    `,
      replacements
    );

    // const qb = getConnection()
    //   .getRepository(Post)
    //   .createQueryBuilder("p")
    //   .innerJoinAndSelect("p.creator", "u", 'u.id = p."creatorId"')
    //   .orderBy('p."createdAt"', "DESC") // postgresql converts all letters to lower case, which will not match. adding single quotes will send the double quotes to them
    //   .take(realLimitPlusOne); // take up to 21 posts

    // if (cursor) {
    //   qb.where('p."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }

    // const posts = await qb.getMany();
    // console.log("posts: ", posts);

    return {
      posts: posts.slice(0, realLimit), // give them what they asked for, ie: 20 posts
      hasMore: posts.length === realLimitPlusOne, // check if there are more posts
    };
  }

  @Query(() => Post, { nullable: true }) //can return null
  post(@Arg("id", () => Int) id: number): Promise<Post | undefined> {
    //OR operation is | as opposed to || in C++
    return Post.findOne(id);
  }

  @Mutation(() => Post) //Queries are for getting data, Mutations are for updating, inserting, deleting
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id", () => Int) id: number,
    @Arg("title") title: string, //must explicitly set the type when making something nullable
    @Arg("text") text: string,
    @Ctx() { req }: MyContext
  ): Promise<Post | null> {
    const result = await getConnection()
      .createQueryBuilder()
      .update(Post)
      .set({ title, text })
      .where('id = :id and "creatorId" = :creatorId', {
        id,
        creatorId: req.session.userId,
      })
      .returning("*")
      .execute();

    return result.raw[0];
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async deletePost(
    @Arg("id", () => Int) id: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    // non cascade delete method

    /* const post = await Post.findOne(id);
    
    if (!post) {
      return false;
    }

    if (post?.creatorId !== req.session.userId) {
      throw new Error("not authorised");
    }

    await Upvote.delete({ postId: id });
    await Post.delete({ id }); */

    // cascade delete method

    await Post.delete({ id, creatorId: req.session.userId });
    return true;
  }
}
