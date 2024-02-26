import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { addMessageMutation, messageAddedSubscription, messagesQuery } from "./queries";

export function useAddMessage() {
  const [mutate] = useMutation(addMessageMutation);

  const addMessage = async (text) => {
    const {
      data: { message },
    } = await mutate({
      variables: { text },
      // we no longer need to update the chache when the user sends a message
      // because the user is also notified by the subscription on their own messages
    });
    return message;
  };

  return { addMessage };
}

export function useMessages() {
  // this gets the initial messages when the component is first rendered
  // it also reflects any changes made to the cache!
  const { data } = useQuery(messagesQuery);

  useSubscription(messageAddedSubscription, {
    // this data is actually a result object
    onData: ({ client, data }) => {
      const newMessage = data.data.message;
      // whenever the subscription receives a new message we add it to the cache
      client.cache.updateQuery({ query: messagesQuery }, (oldData) => ({ messages: [...oldData.messages, newMessage] }));
      // and, because useQuery reflects any changes made to the cache,
      // this is enough for the messages to be updated
    },
  });

  return {
    messages: data?.messages ?? [],
  };
}
