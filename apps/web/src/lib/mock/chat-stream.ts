import type { ChatRequestBody } from "../api";
import type { Citation } from "../types";
import { findMockDocument } from "./document-store";

interface MockAnswer {
  text: string;
  citations: Citation[];
}

const DEMO_DOC_ID = "demo-edital-ibge";

function baseCitation(index: number, documentId: string, page: number, snippet: string): Citation {
  return {
    index,
    chunk_id: `mock-chunk-${index}`,
    document_id: documentId,
    page,
    snippet,
    score: 0.91 - index * 0.04,
  };
}

function pickAnswer(body: ChatRequestBody): MockAnswer {
  const docId = body.document_id ?? DEMO_DOC_ID;
  const doc = findMockDocument(docId);
  const docName = doc?.filename ?? "documento";
  const q = body.question.toLowerCase();

  if (q.includes("inscri") || q.includes("prazo") || q.includes("quando")) {
    return {
      text: `Com base no edital analisado (${docName}), as inscrições estarão abertas de **10/06/2024 a 28/06/2024**, exclusivamente pelo site do organizador [1]. O resultado preliminar está previsto para agosto de 2024 [2].`,
      citations: [
        baseCitation(
          1,
          docId,
          3,
          "CAPÍTULO II — DAS INSCRIÇÕES\n2.1 O período de inscrições terá início em 10/06/2024 e encerramento em 28/06/2024.",
        ),
        baseCitation(2, docId, 12, "CRONOGRAMA: Divulgação do resultado preliminar — 15/08/2024."),
      ],
    };
  }

  if (q.includes("taxa") || q.includes("valor") || q.includes("pagamento")) {
    return {
      text: "A taxa de inscrição é de **R$ 85,00** para nível médio e **R$ 120,00** para nível superior, conforme tabela do edital [1]. Isenção disponível para candidatos inscritos no CadÚnico, nos termos do item 4.2 [2].",
      citations: [
        baseCitation(
          1,
          docId,
          5,
          "TAXA DE INSCRIÇÃO: Nível Médio — R$ 85,00 | Nível Superior — R$ 120,00",
        ),
        baseCitation(
          2,
          docId,
          6,
          "4.2 Farão jus à isenção da taxa os candidatos inscritos no CadÚnico...",
        ),
      ],
    };
  }

  if (q.includes("requisit") || q.includes("cargo") || q.includes("escolaridade")) {
    return {
      text: "Para o cargo de Analista, exige-se **ensino superior completo** em qualquer área, com habilitação para o exercício da função [1]. É necessário também possuir registro profissional ativo na área de atuação, quando aplicável [2].",
      citations: [
        baseCitation(
          1,
          docId,
          8,
          "REQUISITOS: Ensino superior completo, devidamente comprovado na data da posse.",
        ),
        baseCitation(
          2,
          docId,
          9,
          "Registro profissional ativo no conselho de classe competente, quando exigido pelo cargo.",
        ),
      ],
    };
  }

  if (q.includes("origem") || q.includes("fonte") || q.includes("arquivo")) {
    return {
      text: `O documento indica explicitamente: **Origem: Secretaria de Planejamento — versão 2.1** [1]. Esse metadado aparece na capa do PDF analisado (${docName}).`,
      citations: [
        baseCitation(
          1,
          docId,
          1,
          "Origem: Secretaria de Planejamento\nVersão: 2.1\nData de publicação: 15/03/2024",
        ),
      ],
    };
  }

  return {
    text: `Esta é uma **resposta simulada** (modo demonstração). Sobre "${body.question}", o trecho mais relevante em ${docName} menciona procedimentos descritos nas páginas iniciais do documento [1]. Conecte a API real para respostas geradas por RAG.`,
    citations: [
      baseCitation(
        1,
        docId,
        2,
        "O presente documento estabelece normas, prazos e critérios aplicáveis ao processo seletivo.",
      ),
    ],
  };
}

function sseFrame(event: string, data: string): string {
  return `event: ${event}\ndata: ${data}\n\n`;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export function createMockChatStreamResponse(
  body: ChatRequestBody,
  signal?: AbortSignal,
): Response {
  const { text, citations } = pickAnswer(body);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (event: string, data: string) => {
        controller.enqueue(encoder.encode(sseFrame(event, data)));
      };

      try {
        await delay(400, signal);
        push("citations", JSON.stringify({ citations }));

        const parts = text.split(/(\s+)/).filter((p) => p.length > 0);
        for (const part of parts) {
          await delay(25 + Math.random() * 35, signal);
          push("token", part);
        }

        push("done", "");
        controller.close();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          push("error", "mock_stream_error");
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}
