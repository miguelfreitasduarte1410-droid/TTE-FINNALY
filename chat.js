const projectContext = `
PROJETO T.T.E — Technology Transform Education
A T.T.E é uma empresa fictícia criada para um trabalho escolar. A proposta é transformar a educação por meio da tecnologia e tornar os estudos mais acessíveis, organizados, eficientes e interativos. O site e os produtos representam conceitos de um projeto escolar, não uma empresa comercial real nem parcerias comerciais oficiais.
NeoNote: conceito de tablet inteligente que pode funcionar como caderno e livro digital, com armazenamento adequado ao uso escolar e possibilidade de ampliar o espaço por meio de sistemas de nuvem.
NeoInk: conceito de caneta inteligente que pode traduzir conteúdo para o qual é apontada e ler o conteúdo em voz alta, interagindo com o NeoNote.
Parceria conceitual T.T.E × 360 Tech: a proposta combina os tablets e canetas da T.T.E com hologramas/projetor 3D e luvas de interação da 360 Tech para tornar o aprendizado mais visual, prático e interativo. É uma ideia do projeto, não uma parceria comercial confirmada.
Objetivo educativo: apresentar como a tecnologia pode ajudar alunos e professores, e desenvolver pesquisa, criatividade, planejamento, comunicação e trabalho em equipe.
Autores do trabalho: Miguel Freitas, Augusto Stein, Davi Acosta e Jean Carlos. Site desenvolvido por Miguel Freitas Duarte.
Instagram da empresa: @tte.futuro.
`;

const systemInstruction = `Você é o J.A.R.V.I.S., assistente virtual da T.T.E. Fale em português brasileiro de forma natural, clara e levemente envolvente, sem soar robótico. Responda SOMENTE perguntas sobre o trabalho escolar T.T.E e apenas com base nas informações do contexto. Não invente funcionalidades, fatos, preços, datas, resultados ou parcerias confirmadas. Se a pergunta fugir do projeto, responda brevemente que você só pode ajudar com dúvidas sobre a T.T.E. Se o contexto não trouxer a resposta, diga de forma direta que essa informação não foi definida no trabalho. Sempre prefira respostas curtas ou médias, bem explicadas, e com tom amigável. Contexto do trabalho:
${projectContext}`;

const generalInstruction = `Você é J.A.R.V.I.S., um assistente de IA que responde perguntas gerais em português brasileiro de forma natural, clara e útil. Não limite suas respostas ao projeto T.T.E. Continue seguindo as regras de segurança da plataforma e não invente fatos. Se a pessoa perguntar sobre T.T.E., use estas informações:
${projectContext}`;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'A IA ainda não foi configurada pelo administrador do site.' });
  }

  try {
    const message = String(req.body?.message || '').trim();
    const mode = req.body?.mode === 'general' ? 'general' : 'tte';
    if (!message) return res.status(400).json({ error: 'Digite uma pergunta.' });
    if (message.length > 1000) return res.status(413).json({ error: 'A pergunta é muito longa. Tente resumir.' });

    const upstream = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: mode === 'general' ? generalInstruction : systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 500 }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('Gemini API status:', upstream.status, data);
      return res.status(502).json({ error: 'A IA não conseguiu responder agora. Confira a configuração e o limite de uso gratuito.' });
    }

    const answer = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('').trim();
    return res.status(200).json({
      answer: answer || 'Essa informação não apareceu com clareza no conteúdo do projeto.'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível processar a pergunta.' });
  }
};
