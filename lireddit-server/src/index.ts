import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import cors from "cors";
import { createConnection } from "typeorm";
import { User } from "./entities/User";
import { Post } from "./entities/Post";
import path from "path";
import { Upvote } from "./entities/Upvote";
import { createUserLoader } from "./utils/createUserLoader";
import { createUpvoteLoader } from "./utils/createUpvoteLoader";

const main = async () => {
  const conn = await createConnection({
    type: "postgres",
    database: "lireddit2",
    username: "postgres",
    password: "postgres",
    logging: true, // shows sql executing under the hood in terminal
    synchronize: true, // for automatic creation of tables, no need to run migrations
    migrations: [path.join(__dirname, "./migrations/*")],
    entities: [Post, User, Upvote],
  });
  await conn.runMigrations();

  // await Post.delete({}); // empty out database

  const app = express(); //create instance of express

  //Testing for rest endpoints
  //app.get creates a get endpoint
  //'/' = home route
  //_ in the req (request) spot is just best practice for an ignored variable

  // app.get('/', (_, res) => {
  //     res.send("hello");
  // });

  const RedisStore = connectRedis(session);
  const redis = new Redis();
  app.use(
    // runs middleware globally
    // if want to specify route, add '/', before cors
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  app.use(
    //important to run session middleware before apollo middleware
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis as any,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
        httpOnly: true, //for security reasons, so that front-end JavaScript cannot access the cookie
        sameSite: "lax", //protect csrf
        secure: __prod__, //cookie only works in https
      },
      saveUninitialized: false, //create session by default even if no data is stored in it (if set to true), we dont want that
      secret: "rucngxoizwugxruiegwxoiufh",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      upvoteLoader: createUpvoteLoader(),
    }), //context is a special object that is accessible by all resolvers
    plugins: [
      ApolloServerPluginLandingPageGraphQLPlayground({
        settings: {
          "request.credentials": "include",
        },
      }),
    ],
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false }); //creates graphql endpoint on express

  app.listen(4000, () => {
    console.log("server started on localhost:4000");
  });
  //run SQLs
  // const post = orm.em.create(Post, {title: 'my first post'});
  // await orm.em.persistAndFlush(post);

  //find all posts
  // const posts = await orm.em.find(Post, {});
  // console.log(posts);
};

main().catch((err) => {
  console.error(err);
});
