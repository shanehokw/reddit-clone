import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Upvote } from "./Upvote";
import { User } from "./User";

@ObjectType() //convert the class into graphql type
@Entity()
export class Post extends BaseEntity {
  @Field() //dont add this on fields that you dont want exposed to graphql schema
  @PrimaryGeneratedColumn() //<- these @s are decorators
  id!: number;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  text!: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field(() => Int, { nullable: true })
  voteStatus: number | null; // 1 or -1 or null

  @Field()
  @Column()
  creatorId: number;

  // this will set up a foreign key to the User table
  @Field()
  @ManyToOne(() => User, (user) => user.posts)
  creator: User;

  @OneToMany(() => Upvote, (upvote) => upvote.post)
  upvotes: Upvote[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
