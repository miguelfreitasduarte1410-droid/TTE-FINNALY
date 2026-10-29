
const projectContext = `
PROJETO T.T.E — Technology Transform Education

A T.T.E é uma empresa fictícia criada para um trabalho escolar. A proposta é transformar a educação por meio da tecnologia e tornar os estudos mais acessíveis, organizados, eficientes e interativos.

NeoNote: tablet inteligente conceitual que funciona como caderno e livro digital, com armazenamento e expansão por nuvem.

NeoInk: caneta inteligente conceitual que traduz conteúdos, lê textos em voz alta e interage com o NeoNote.

T.T.E × 360 Tech: parceria conceitual com hologramas, projetor 3D e luvas interativas. Não é uma parceria comercial confirmada.

Autores: Miguel Freitas, Augusto Stein, Davi Acosta e Jean Carlos.
Site desenvolvido por Miguel Freitas Duarte.
Instagram: @tte.futuro.
`;

const restrictedInstruction = `
Você é J.A.R.V.I.S., assistente virtual da T.T.E.
Responda em português brasileiro, naturalmente.

Responda somente sobre o projeto T.T.E., usando o contexto fornecido.
Não invente informações sobre produtos, preços, resultados ou parcerias.
Se perguntarem sobre outro assunto, explique brevemente que você
está no modo restrito e só responde sobre a T.T.E.

Contexto:
${projectContext}
`;

const generalInstruction = `
Você é J.A.R.V.I.S., um assistente de inteligência artificial.
Responda perguntas sobre assuntos gerais em português brasileiro,
de forma clara, útil e natural.

Não limite suas respostas ao projeto T.T.E.
Siga as regras de segurança aplicáveis e evite inventar informações.

Se perguntarem sobre a T.T.E., utilize este contexto:
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

  try {
    const message = String(req.body?.message || "").trim();

    const mode = req.body?.mode === "general"
      ? "general"
      : "tte";

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

    const instruction = mode === "general"
      ? generalInstruction
      : restrictedInstruction;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=" +
      encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
        })
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Gemini API status:",
        response.status,
        data?.error?.message || "Erro desconhecido"
      );

      return res.status(502).json({
        error:
          "A IA não conseguiu responder agora. " +
          "Confira a configuração e o limite de uso gratuito."
      });
    }

    const answer = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map(part => part.text || "")
      .join("")
      .trim();

    return res.status(200).json({
      answer:
        answer ||
        "Não consegui gerar uma resposta para essa pergunta."
    });

  } catch (error) {
    console.error("Erro J.A.R.V.I.S.:", error.message);

    return res.status(500).json({
      error: "Não foi possível processar a pergunta."
    });
  }
};
