import config from "$env";
import { addConversation, type ConversationPart, getConversations, resetConversation } from "./db.ts";
import fetch from "https://cdn.skypack.dev/node-fetch"; // Import fetch for making HTTP requests
import { Context } from "grammy/mod.ts"; // Import Context from grammy for sending images

const baseUrl =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
  config.DEFAULT_API_KEY;

async function getResponse(ctx: Context, user_id: number, question: string) {
  const convArray = new Array<Map<string, ConversationPart[]>>();

  let userConv = new Map<string, any>();
  userConv
    .set("role", "user")
    .set("parts", [{ text: question }] as ConversationPart[]);

  const conversationHistory = await getConversations(user_id);

  await checkAndClearOldConversations(user_id, conversationHistory);

  convArray.push(userConv);

  let convHistoryToSend: Array<Map<string, ConversationPart[]>> =
    conversationHistory;
  let jsonConvHistoryToSend;

  if (!conversationHistory || conversationHistory.length === 0) {
    convHistoryToSend = [userConv];
    jsonConvHistoryToSend = convHistoryToSend.map((conversationMap) => {
      const conversationArray: [string, ConversationPart[]][] = Array.from(
        conversationMap.entries(),
      );
      return Object.fromEntries(conversationArray);
    });
  } else {
    conversationHistory.push(userConv);
    jsonConvHistoryToSend = [];
    for (let i = 0; i < conversationHistory.length; i++) {
      const conversationMap = conversationHistory[i];
      if (conversationMap instanceof Map) {
        const conversationArray: [string, ConversationPart[]][] = Array.from(
          conversationMap.entries(),
        );
        jsonConvHistoryToSend.push(Object.fromEntries(conversationArray));
      } else {
        jsonConvHistoryToSend.push(conversationMap);
      }
    }
  }

  const response: Response = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: jsonConvHistoryToSend,
      safetySettings: [
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
    }),
  });

  let textResponse = "";
  let imageResponse = ""; // Add a variable to store the image URL

  try {
    const resp = await response.json();
    textResponse = resp.candidates[0].content.parts[0].text;
    imageResponse = resp.candidates[0].content.parts[1].image; // Assuming the API response includes an image URL
  } catch (err) {
    console.error("User: ", user_id, "Error: ", err);
    return "Sorry, I'm having trouble understanding you. Could you please rephrase your question?";
  }

  const modelConv = new Map<string, any>();
  modelConv
    .set("role", "model")
    .set("parts", [{ text: textResponse }] as ConversationPart[]);

  convArray.push(modelConv);

  await addConversation(user_id, convArray);

  // If an image URL is available, send it along with the text response
  if (imageResponse) {
    // Call sendImage function to send the image
    await sendImage(ctx, user_id, imageResponse);
  }

  return textResponse.replaceAll("* ", "→ ");
}

async function checkAndClearOldConversations(
  id: number,
  conversationHistory: Array<Map<string, ConversationPart[]>>,
) {
  // this function keeps removing the first 2 elements of the array until the total conversations length is less than 50
  if (conversationHistory.length > 50) {
    conversationHistory.shift();
    conversationHistory.shift();
    await resetConversation(id, conversationHistory);
  }
}

async function getModelInfo() {
  try {
    const data = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro?key=" +
        config.DEFAULT_API_KEY,
    );
    const resp = await data.json();
    return `
<b>Model Name:</b> <blockquote>${resp.displayName} v${resp.version} [${resp.name}]</blockquote>
<b>Description:</b> <blockquote>${resp.description}</blockquote>
<b>Input Token Limit:</b> <blockquote>${resp.inputTokenLimit}</blockquote>
<b>Output Token Limit:</b> <blockquote>${resp.outputTokenLimit}</blockquote>

<b>Bot developed and hosted by @kysage1.</b>
`;
  } catch (err) {
    return "Could not fetch data. Try again later!";
  }
}

// Function to send images
async function sendImage(ctx: Context, userId: number, imageUrl: string) {
  try {
    await ctx.api.sendPhoto(userId, imageUrl);
  } catch (error) {
    console.error("Error sending image:", error);
  }
}

export { getModelInfo, getResponse };
