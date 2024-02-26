import { useMutation, useQuery } from "@apollo/client";
import { addMessageMutation, messagesQuery } from "./queries";

export function useAddMessage() {
  const [mutate] = useMutation(addMessageMutation);

  const addMessage = async (text) => {
    const {
      data: { message },
    } = await mutate({
      variables: { text },
      // this updates the cache
      // this way the message a user just sent is added to their cache, becoming immediately visible to them
      update: (cache, { data }) => {
        const newMessage = data.message;
        // this means: when the messagesQuery is resolved,
        // update the cache data using the following function
        cache.updateQuery({ query: messagesQuery }, (oldData) => ({ messages: [...oldData.messages, newMessage] }));
      },
    });
    return message;
  };

  return { addMessage };
}

export function useMessages() {
  const { data } = useQuery(messagesQuery);
  return {
    messages: data?.messages ?? [],
  };
}
