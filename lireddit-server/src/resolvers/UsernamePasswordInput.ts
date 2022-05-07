import { Field, InputType } from "type-graphql";

@InputType() //InputTypes can be used for arguments
export class UsernamePasswordInput {
  @Field()
  email: string;
  @Field()
  username: string;
  @Field()
  password: string;
}
