import { join } from "path";
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  utils,
} from "@builderbot/bot";
import { MemoryDB as Database } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

const PORT = process.env.PORT ?? 3008;

import { button1 } from "./openaiFlow.js";
import { button2 } from "./geminiFlow.js";


const welcomeFlow = addKeyword<Provider, Database>(["Chatbot"])
  .addAnswer(`🙌 Hello welcome to the *Chatbot*`, { media: "./foto.png" })
  .addAnswer(
    `Choose an option: 
    1. ChatGPT
    2. Gemini`,
    { capture: true },
    async (ctx, { flowDynamic, fallBack }) => {
      // Lógica para capturar la opción del usuario
      if (ctx.body.includes("1")) {
        await flowDynamic("Seleccionaste *ChatGPT*");
      } else if (ctx.body.includes("2")) {
        await flowDynamic("Seleccionaste *Gemini*");
      } else {
        // Si el usuario no selecciona una opción válida
        await flowDynamic("Opción no válida. Por favor, elige una opción!");
        return fallBack(); // Volver a preguntar si la respuesta es incorrecta
      }
    },
    [button1, button2]
  );

const main = async () => {
  const adapterFlow = createFlow([welcomeFlow]);

  const adapterProvider = createProvider(Provider);
  const adapterDB = new Database();

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  adapterProvider.server.post(
    "/v1/messages",
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body;
      await bot.sendMessage(number, message, { media: urlMedia ?? null });
      return res.end("sended");
    })
  );

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  httpServer(+PORT);
};

main();
