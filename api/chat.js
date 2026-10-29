
const projectContext = `
PROJETO T.T.E — Technology Transform Education

A T.T.E é uma empresa fictícia criada para um trabalho escolar.
Seu objetivo é mostrar como a tecnologia pode tornar os estudos
mais acessíveis, organizados, eficientes e interativos.

NeoNote: conceito de tablet que funciona como caderno e livro
digital, com armazenamento e expansão pela nuvem.

NeoInk: conceito de caneta inteligente que traduz conteúdos,
lê textos em voz alta e interage com o NeoNote.

T.T.E × 360 Tech: ideia de integração com hologramas,
projetor 3D e luvas interativas. Não é uma parceria
comercial confirmada.

Autores: Miguel Freitas, Augusto Stein, Davi Acosta e Jean Carlos.
Site desenvolvido por Miguel Freitas Duarte.
Instagram: @tte.futuro.
`;

const restrictedInstruction = `
Você é J.A.R.V.I.S., assistente virtual da T.T.E.
Responda em português brasileiro de maneira natural e amigável.

Responda SOMENTE sobre a T.T.E., usando o contexto fornecido.
Não invente informações sobre produtos, preços ou parcerias.

Se perguntarem sobre outro assunto, explique brevemente que
você está no modo restrito ao projeto.

Se não souber uma informação, diga que ela não foi definida
no trabalho.

Contexto:
${projectContext}
`;

const generalInstruction = `
Você é J.A.R.V.I.S., um assistente de inteligência artificial.
Responda em português brasileiro, de modo claro, útil e natural.

Você pode responder perguntas sobre assuntos gerais,
não apenas sobre a T.T.E.

Evite inventar informações e siga as regras de segurança aplicáveis.

Para perguntas sobre a T.T.E., use este contexto:
${projectContext}
`;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "A IA ainda não foi configurada pelo administrador do site."
    });
  }

  const message = String(req.body?.message ?? "").trim();

  if (!message) {
    return res.status(400).json({
      error: "Digite uma pergunta."
    });
  }

  if (message.length > 1000) {
    return res.status(413).json({
      error: "A pergunta é muito longa. Tente resumir."
    });
  }

  // O modo restrito é o padrão.
  const mode =
    req.body?.mode === "general" ? "general" : "tte";

  const instruction =
    mode === "general"
      ? generalInstruction
      : restrictedInstruction;

  const model =
    process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: instruction }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: message }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 1200
          }
        }),
        signal: AbortSignal.timeout(25000)
      }
    );

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      const status = upstream.status;
      const providerCode = String(
        data?.error?.status || "UNKNOWN"
      );
      const providerMessage = String(
        data?.error?.message || "Sem detalhes"
      );

      console.error("Gemini API:", {
        status,
        code: providerCode,
        message: providerMessage,
        model
      });

      return res.status(502).json({
        error: "Falha na comunicação com o Gemini.",
        geminiStatus: status,
        geminiCode: providerCode,
        diagnosticId: `GEMINI_${status}`
      });
    }

    const answer = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map(part => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      console.error("Gemini sem texto de resposta:", {
        finishReason:
          data.candidates?.[0]?.finishReason || "UNKNOWN",
        model
      });

      return res.status(502).json({
        error: "O Gemini não retornou uma resposta em texto.",
        diagnosticId: "GEMINI_EMPTY_RESPONSE"
      });
    }

    return res.status(200).json({
      answer
    });

  } catch (error) {
    console.error(
      "Erro na conexão com Gemini:",
      error?.message || "Erro desconhecido"
    );

    return res.status(502).json({
      error: "Não foi possível conectar ao Gemini.",
      diagnosticId: "GEMINI_CONNECTION_ERROR"
    });
  }
};
