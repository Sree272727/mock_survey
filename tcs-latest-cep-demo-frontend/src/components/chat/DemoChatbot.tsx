import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { useMode } from "@/context/ModeContext";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type QAPair = { question: string; answer: string };

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
};

/* ------------------------------------------------------------------ */
/*  Predefined Q&A sets                                                */
/* ------------------------------------------------------------------ */

const CUSTOMER_QA: QAPair[] = [
  {
    question: "How do I start a new survey?",
    answer:
      'Navigate to the Surveys page from the sidebar. Click the "+ Create Survey" button in the top-right corner, select the survey type (Annual Recertification, Complaint Investigation, or Focused Revisit), choose the facility and resident, then click "Create." Your new survey workspace will open automatically.',
  },
  {
    question: "How do I add evidence to a survey?",
    answer:
      "While working in any Critical Element Pathway, look for the Evidence panel in the KPI bar area. Click it to expand, then use \"Upload File\" to attach documents or \"Take Photo\" to capture images directly from your device's camera. Evidence is linked to the survey case for easy reference.",
  },
  {
    question: "What are the Critical Element Pathways?",
    answer:
      "Critical Element Pathways (CEPs) are structured CMS assessment workflows used during surveys. This tool includes three pathways: General CEP (overall care assessment), Neglect CEP (focused on neglect indicators), and Infection Control CEP (infection prevention practices). Each pathway guides you through a series of compliance questions in a required order.",
  },
  {
    question: "How do I view compliance findings?",
    answer:
      'Go to the "Findings Summary" page in the survey sidebar navigation. This page displays all flagged citations, deficiencies, and compliance issues identified during your survey. Findings are organized by pathway and severity level. You can click on any finding to see the related questions and evidence.',
  },
  {
    question: "What do the compliance scores mean?",
    answer:
      "Compliance scores on the Dashboard reflect overall facility readiness. A score of 90\u2013100 indicates strong compliance, 70\u201389 suggests areas needing improvement, and below 70 flags significant concerns. Scores are calculated based on responses across all completed pathways and update in real-time as you answer questions.",
  },
  {
    question: "How do I complete a survey?",
    answer:
      "To complete a survey, you must finish all required Critical Element Pathways (General, Neglect, and Infection Control) in order. Each pathway shows a progress indicator and a completion status. Once all pathways are marked as completed, navigate to the Findings Summary to review results before finalizing.",
  },
];

const PLATFORM_QA: QAPair[] = [
  {
    question: "How do I create a new pathway?",
    answer:
      'Navigate to "Pathways" in the sidebar under Content Management. Click "Add Pathway" to create a new pathway definition. Enter a name, slug, and description. You can then add sections and link questions from the Question Library. Pathways define the structured flow that surveyors follow during assessments.',
  },
  {
    question: "How do I add questions to a template?",
    answer:
      'Go to the "Templates" page in the sidebar. Select the template you want to edit, then manage its sections and questions. You can add questions from the Question Library by searching or browsing. Questions can be reordered within sections and configured with response types and required evidence flags.',
  },
  {
    question: "What is the Workflow Builder?",
    answer:
      'The Workflow Builder is an advanced tool found under "Advanced Tools" in the sidebar. It provides an interface for designing and importing survey workflows by connecting pathways, sections, and questions into a logical flow. You can define branching logic, set dependencies between sections, and configure conditional question paths.',
  },
  {
    question: "How do I configure survey templates?",
    answer:
      'Go to "Templates" in the sidebar. Templates define which pathways and questions are included in a specific survey type. Click "Create Template" to start, then assign a name and survey type. Add pathways from the available list, customize section ordering, and set which questions are mandatory vs. optional.',
  },
  {
    question: "How do I manage the Question Library?",
    answer:
      "The Question Library is accessible from the sidebar under Content Management. Here you can create, edit, and organize all survey questions. Each question has a code, prompt text, response type (Yes/No, multiple choice), and regulatory reference. Use the search and pathway filter tools to find specific questions.",
  },
  {
    question: "How do I set up compliance rules?",
    answer:
      "Compliance rules are configured within pathways using the Workflow Builder. When editing a pathway, you can set actions on question responses \u2014 for example, flagging a citation when a specific answer is selected, requiring minimum evidence, or setting severity levels. Regulatory F-tag references can be linked to each question for traceability.",
  },
];

const FALLBACK_RESPONSE =
  "I'm sorry, I don't have an answer for that yet. This is a demo assistant with predefined responses. Please try one of the suggested questions below!";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DemoChatbot() {
  const { mode } = useMode();
  const qaSet = mode === "customer" ? CUSTOMER_QA : PLATFORM_QA;
  const modeLabel = mode === "customer" ? "LTC Customer" : "Platform Admin";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) handleToggle();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleToggle() {
    if (isOpen) {
      setMessages([]);
      setInputValue("");
      setIsTyping(false);
    }
    setIsOpen((prev) => !prev);
  }

  function handleSelectQuestion(questionText: string) {
    if (!questionText.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: questionText.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    const match = qaSet.find(
      (qa) => qa.question.toLowerCase() === questionText.trim().toLowerCase()
    );

    setIsTyping(true);

    setTimeout(() => {
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "bot",
        text: match ? match.answer : FALLBACK_RESPONSE,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 800);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    handleSelectQuestion(inputValue);
  }

  // Filter out already-asked questions from chips
  const askedQuestions = new Set(
    messages.filter((m) => m.role === "user").map((m) => m.text.toLowerCase())
  );
  const remainingQuestions = qaSet.filter(
    (qa) => !askedQuestions.has(qa.question.toLowerCase())
  );

  return (
    <>
      {/* ── Floating bubble ──────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          aria-label="Open help chat"
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-[#0077b6] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 hover:bg-[#005f8a]"
        >
          <span className="absolute inset-0 rounded-full bg-[#0077b6] animate-ping opacity-20 pointer-events-none" style={{ animationIterationCount: 3 }} />
          <MessageCircle className="h-6 w-6 relative" />
        </button>
      )}

      {/* ── Chat window ──────────────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Demo chat assistant"
          className="fixed bottom-6 right-6 z-40 w-[380px] max-sm:w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
          style={{ height: 500 }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#0077b6]">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-white leading-tight">Survey Assistant</p>
              <p className="text-[11px] text-white/70 leading-tight">{modeLabel} Mode</p>
            </div>
            <button
              onClick={handleToggle}
              aria-label="Close chat"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Welcome message when empty */}
            {messages.length === 0 && !isTyping && (
              <div className="flex gap-2.5">
                <div className="shrink-0 h-7 w-7 rounded-full bg-[#edf5fc] flex items-center justify-center mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0077b6]" />
                </div>
                <div className="bg-[#edf5fc] rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                  <p className="text-[13px] text-gray-700 leading-relaxed">
                    Hi! I'm your Survey Assistant. Pick a question below to get started, or type your own!
                  </p>
                </div>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="bg-[#0077b6] rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-[13px] text-white leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-2.5">
                  <div className="shrink-0 h-7 w-7 rounded-full bg-[#edf5fc] flex items-center justify-center mt-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0077b6]" />
                  </div>
                  <div className="bg-[#edf5fc] rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-[85%]">
                    <p className="text-[13px] text-gray-700 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="shrink-0 h-7 w-7 rounded-full bg-[#edf5fc] flex items-center justify-center mt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#0077b6]" />
                </div>
                <div className="bg-[#edf5fc] rounded-xl rounded-tl-sm px-4 py-3 inline-flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms`, animationDuration: "0.6s" }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested question chips */}
          <div className="shrink-0 border-t border-gray-100 px-3 py-2.5 max-h-[120px] overflow-y-auto">
            {remainingQuestions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {remainingQuestions.map((qa) => (
                  <button
                    key={qa.question}
                    onClick={() => handleSelectQuestion(qa.question)}
                    disabled={isTyping}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1.5 rounded-full border transition-colors text-left",
                      "bg-[#edf5fc] text-[#0077b6] border-[#c7ddf0] hover:bg-[#dcedf8]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {qa.question}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400 text-center py-1">
                You've explored all the demo questions! Feel free to type your own.
              </p>
            )}
          </div>

          {/* Input area */}
          <form onSubmit={handleSubmit} className="shrink-0 border-t border-gray-200 px-3 py-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a question..."
              disabled={isTyping}
              aria-label="Type a question"
              className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0077b6]/30 focus:border-[#0077b6] disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message"
              className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                inputValue.trim() && !isTyping
                  ? "bg-[#0077b6] text-white hover:bg-[#005f8a]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
