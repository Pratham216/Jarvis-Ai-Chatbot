import { currentUser } from "@clerk/nextjs/server";
import ChatApp from "@/components/chat/ChatApp";
import { fetchModels } from "@/lib/llm/models";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const [user, models] = await Promise.all([currentUser(), fetchModels()]);
  const envDefault = process.env.DEFAULT_MODEL;
  const defaultModel =
    (envDefault && models.find((m) => m.id === envDefault)?.id) ||
    models.find((m) => m.free)?.id ||
    models[0]?.id ||
    "";

  return (
    <ChatApp
      defaultModel={defaultModel}
      models={models}
      currentUser={
        user
          ? {
              id: user.id,
              name:
                user.firstName ||
                user.username ||
                user.emailAddresses[0]?.emailAddress ||
                "You",
              imageUrl: user.imageUrl,
            }
          : null
      }
    />
  );
}
