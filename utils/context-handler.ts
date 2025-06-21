import { SimpleChatStore, type MessageContentDetail } from "llamaindex";
import { moneyFrogAgent } from "../agents/money-frog";
import { getSystemPrompt } from "./get-system-prompt";

export const store = new SimpleChatStore();

export async function contextHandler(
  userId: number,
  text: string | undefined,
  files?: URL[]
) {
  store.addMessage(userId.toString(), {
    role: "user",
    content: [
      {
        type: "text",
        text: text ?? "",
      },
      ...(!!files && files.length > 0
        ? files.map(
            (file) =>
              ({
                type: "image_url",
                image_url: {
                  url: file.toString(),
                },
              } as MessageContentDetail)
          )
        : []),
    ],
  });

  const chatHistory = store.getMessages(userId.toString());
  const lastMessage = chatHistory.pop();

  const result = await moneyFrogAgent.run(lastMessage?.content ?? "", {
    chatHistory: [
      {
        role: "system",
        content: getSystemPrompt(),
      },
      ...chatHistory,
    ],
  });

  store.addMessage(userId.toString(), {
    role: "assistant",
    content: result.data.result?.toString() ?? "",
  });

  return result.data.result?.toString() || "error";
}
