import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const blobToBase64 = <T,>(blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const mimeType = audioBlob.type;
    const base64Audio = await blobToBase64(audioBlob);

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Audio,
      },
    };

    const textPart = {
      text: `Eres un asistente de transcripción de audio altamente preciso. Tu tarea es transcribir el siguiente audio. El audio está en español. Proporciona una transcripción limpia y literal. No agregues comentarios ni notas, solo el texto transcrito.`,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [audioPart, textPart] },
    });

    return response.text;
  } catch (error) {
    console.error("Error transcribing audio:", error);
    if (error instanceof Error) {
        return `Error en la transcripción: ${error.message}`;
    }
    return "Ocurrió un error desconocido durante la transcripción.";
  }
};
