import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import OpenAI from "openai";
import { useEffect } from "react";
import { OLLAMA_MODEL } from "../../../const/defaults";
import { ALERT, FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { OllamaPreferences } from "../../../summarizeVideoWithOllama";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { buildFollowUpMessages } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
  questions: Question[];
};

export function useOllamaFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
  questions,
}: FollowUpQuestionParams) {
  const preferences = getPreferenceValues() as OllamaPreferences;
  const { ollamaEndpoint, ollamaModel, creativity } = preferences;

  useEffect(() => {
    const abortController = new AbortController();

    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      const openai = new OpenAI({
        baseURL: ollamaEndpoint,
        apiKey: "ollama", // required but unused by Ollama
      });

      // Extract summary (first item) and previous Q&A (rest)
      const summary = questions[0]?.answer || "";
      const previousQA = questions.slice(1).map((q) => ({ question: q.question, answer: q.answer }));

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      const messages = buildFollowUpMessages(question, transcript, summary, previousQA);

      const answer = openai.chat.completions.stream(
        {
          model: ollamaModel || OLLAMA_MODEL,
          messages,
          stream: true,
          temperature: Number.parseFloat(creativity),
        },
        { signal: abortController.signal },
      );

      answer.on("content", (delta) => {
        toast.show();
        setQuestions((prevQuestions) =>
          prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + delta } : q)),
        );
      });

      answer.finalChatCompletion().then(() => {
        toast.hide();
        setQuestion("");
      });

      if (abortController.signal.aborted) return;

      answer.on("error", (error) => {
        if (abortController.signal.aborted) return;
        toast.style = Toast.Style.Failure;
        toast.title = ALERT.title;
        toast.message = error.message;
      });
    };

    handleAdditionalQuestion();

    return () => {
      abortController.abort();
    };
  }, [question, transcript, questions, creativity, ollamaEndpoint, ollamaModel, setQuestion, setQuestions]);
}
