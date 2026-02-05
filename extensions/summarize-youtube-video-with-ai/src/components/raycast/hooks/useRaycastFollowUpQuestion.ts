import { AI, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";
import { FINDING_ANSWER } from "../../../const/toast_messages";
import type { Question } from "../../../hooks/useQuestions";
import type { RaycastPreferences } from "../../../summarizeVideoWithRaycast";
import { generateQuestionId } from "../../../utils/generateQuestionId";
import { getFollowUpQuestionSnippet } from "../../../utils/getAiInstructionSnippets";

type FollowUpQuestionParams = {
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setQuestion: React.Dispatch<React.SetStateAction<string>>;
  transcript: string | undefined;
  question: string;
  questions: Question[];
};

export function useRaycastFollowUpQuestion({
  setQuestions,
  setQuestion,
  transcript,
  question,
  questions,
}: FollowUpQuestionParams) {
  const abortController = new AbortController();
  const preferences = getPreferenceValues() as RaycastPreferences;
  const { creativity } = preferences;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `abortController` in dependencies will lead to an error
  useEffect(() => {
    const handleAdditionalQuestion = async () => {
      if (!question || !transcript) return;
      const qID = generateQuestionId();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: FINDING_ANSWER.title,
        message: FINDING_ANSWER.message,
      });

      // Extract summary (first item) and previous Q&A (rest)
      const summary = questions[0]?.answer || "";
      const previousQA = questions.slice(1).map((q) => ({ question: q.question, answer: q.answer }));

      const answer = AI.ask(getFollowUpQuestionSnippet(question, transcript, summary, previousQA), {
        creativity: Number.parseFloat(creativity),
        signal: abortController.signal,
      });

      setQuestions((prevQuestions) => [
        {
          id: qID,
          question,
          answer: "",
        },
        ...prevQuestions,
      ]);

      answer.on("data", (data) => {
        toast.show();
        setQuestions((prevQuestions) => {
          const updatedQuestions = prevQuestions.map((q) => (q.id === qID ? { ...q, answer: q.answer + data } : q));
          return updatedQuestions;
        });
      });

      answer.finally(async () => {
        toast.hide();
        setQuestion("");
      });

      if (abortController.signal.aborted) return;
    };

    handleAdditionalQuestion();

    return () => {
      abortController.abort();
    };
  }, [question, transcript, questions, creativity, setQuestion, setQuestions]);
}
