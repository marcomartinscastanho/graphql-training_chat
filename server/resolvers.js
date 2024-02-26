import { GraphQLError } from "graphql";
import { createMessage, getMessages } from "./db/messages.js";
import { PubSub } from "graphql-subscriptions";

// do not use this in production!
const pubSub = new PubSub();

export const resolvers = {
  Query: {
    messages: (_root, _args, { user }) => {
      if (!user) throw unauthorizedError();
      return getMessages();
    },
  },

  Mutation: {
    addMessage: async (_root, { text }, { user }) => {
      if (!user) throw unauthorizedError();
      const message = await createMessage(user, text);
      pubSub.publish("MESSAGE_ADDED", { messageAdded: message });
      return message;
    },
  },

  Subscription: {
    // normally resolvers are functions
    // but Subscriptions are different in the way that they don't return a single value/response (as in Query or Mutation)
    // instead they notify the client whenever an event occurs
    // hence they can generate multiple values over time.
    // A subscription resolver is an object that provide a subscribe function
    // and this function must return an async iterable -> AsyncGenerator
    // (AsyncGenerator is quite advanced JS, instead we'll use graphql-subscriptions, which is an abstraction of this)
    messageAdded: {
      // this listens to the MESSAGE_ADDED event
      // and notifies the clients that have subscribed to this event
      subscribe: (_root, _args, { user }) => {
        if (!user) throw unauthorizedError();
        return pubSub.asyncIterator("MESSAGE_ADDED");
      },
    },
  },
};

function unauthorizedError() {
  return new GraphQLError("Not authenticated", {
    extensions: { code: "UNAUTHORIZED" },
  });
}
