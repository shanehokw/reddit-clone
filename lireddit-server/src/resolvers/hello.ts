import { Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver {
    @Query(() => String ) //declare what the function returns within brackets
    hello() {
        return "bye"
    }
}