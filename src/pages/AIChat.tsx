import {
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronDown,
  Clock3,
  FileText,
  Menu,
  Mic,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DMCFSLogo from "../components/brand/DMCFSLogo";
import { supabase } from "../services/supabase";

type Context = "DMCFS" | "RTHC" | "RTCA" | "RTCPM";
type Provider = "openai" | "claude";
type Message = { id: number; role: "assistant" | "user"; content: string; source?: string };

const providers: { value: Provider; label: string }[] = [
  { value: "openai", label: "OpenAI · GPT-4.1 mini" },
  { value: "claude", label: "Claude · Sonnet 4.5" },
];

const contexts: { label: Context; description: string; icon: typeof BrainCircuit }[] = [
  { label: "DMCFS", description: "All platform knowledge", icon: BrainCircuit },
  { label: "RTHC", description: "Headcount operations", icon: Users },
  { label: "RTCA", description: "Business analytics", icon: BarChart3 },
  { label: "RTCPM", description: "Coordinator performance", icon: TrendingUp },
];

const quickPrompts = [
  { label: "Today's business summary", icon: Sparkles, prompt: "Give me today's DMCFS business summary." },
  { label: "Current headcount", icon: Users, prompt: "Show today's headcount summary." },
  { label: "Growth analysis", icon: TrendingUp, prompt: "How is business growth this month?" },
  { label: "RTCPM summary", icon: FileText, prompt: "Give me the latest RTCPM assessment summary." },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Welcome. I am your DMCFS enterprise assistant. Ask about workforce operations, business analytics, or coordinator performance, and I will use the authorized platform data available to you.",
  },
];

export default function AIChat() {
  const navigate = useNavigate();
  const [activeContext, setActiveContext] = useState<Context>("DMCFS");
  const [activeProvider, setActiveProvider] = useState<Provider>("openai");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const activeContextDetails = useMemo(
    () => contexts.find((context) => context.label === activeContext) || contexts[0],
    [activeContext],
  );

  const sendMessage = async (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    const content = (prompt ?? input).trim();
    if (!content || isSending) return;

    const userMessage: Message = { id: Date.now(), role: "user", content };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsSidebarOpen(false);
    setIsSending(true);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("Your session is not available. Please sign in again.");

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ provider: activeProvider, context: activeContext, messages: [...messages.filter((message) => message.id !== 1 || message.role === "assistant"), userMessage].map(({ role, content: messageContent }) => ({ role, content: messageContent })) }),
      });
      const responseText = await response.text();
      let payload: { answer?: string; source?: string; message?: string } = {};
      try {
        payload = responseText ? JSON.parse(responseText) as typeof payload : {};
      } catch {
        throw new Error(response.status === 404
          ? "AI backend route was not found. Start the DMCFS server and try again."
          : "AI backend is unavailable. Start the DMCFS server and try again.");
      }
      if (!response.ok) throw new Error(payload.message || "AI service is temporarily unavailable. Please try again.");

      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: payload.answer || "I could not produce an answer.", source: payload.source }]);
    } catch (error) {
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: error instanceof Error ? error.message : "AI service is temporarily unavailable. Please try again." }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f6f8] text-slate-900 dark:bg-[#07111d] dark:text-slate-100">
      <div className="flex min-h-screen">
        {isSidebarOpen && <button aria-label="Close chat navigation" className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[292px] flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-300 dark:border-slate-800 dark:bg-[#0b1724] lg:relative lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex items-center justify-between px-2">
            <DMCFSLogo variant="full" size="sm" className="w-[142px]" />
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" onClick={() => setIsSidebarOpen(false)} aria-label="Close sidebar"><X className="h-5 w-5" /></button>
          </div>
          <button className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-[#ff6600] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(255,102,0,0.2)] transition hover:bg-[#e85b00]" onClick={() => setMessages(initialMessages)}><Plus className="h-4 w-4" /> New chat</button>
          <div className="mt-8 flex items-center justify-between px-2"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Recent chats</p><Search className="h-4 w-4 text-slate-400" /></div>
          <div className="mt-3 space-y-1">
            {["Headcount summary for today", "RTCA growth analysis", "Coordinator assessment"].map((title, index) => (
              <button key={title} className={`w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/70 ${index === 0 ? "bg-[#fff4ed] dark:bg-[#321d12]" : ""}`}>
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p><p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3" /> {index + 1} day{index ? "s" : ""} ago</p>
              </button>
            ))}
          </div>
          <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800"><button onClick={() => navigate("/app-select")} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Back to applications</button></div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8 dark:border-slate-800 dark:bg-[#0b1724]/90">
            <div className="flex items-center gap-3"><button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" onClick={() => setIsSidebarOpen(true)} aria-label="Open chat navigation"><Menu className="h-5 w-5" /></button><div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff6600]">DMCFS AI</p><h1 className="mt-0.5 text-lg font-semibold tracking-tight">Enterprise assistant</h1></div></div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="ai-provider">AI model</label>
              <select id="ai-provider" value={activeProvider} onChange={(event) => setActiveProvider(event.target.value as Provider)} className="max-w-[150px] rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:max-w-none sm:px-3 sm:text-sm">
                {providers.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className="relative"><button onClick={() => setIsContextOpen((open) => !open)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"><activeContextDetails.icon className="h-4 w-4 text-[#ff6600]" /><span className="hidden text-sm font-medium sm:block">Ask {activeContextDetails.label}</span><ChevronDown className="h-4 w-4 text-slate-400" /></button>{isContextOpen && <div className="absolute right-0 top-12 z-20 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">{contexts.map(({ label, description, icon: Icon }) => <button key={label} onClick={() => { setActiveContext(label); setIsContextOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><Icon className="h-4 w-4 text-[#ff6600]" /><span><span className="block text-sm font-medium">Ask {label}</span><span className="block text-xs text-slate-400">{description}</span></span></button>)}</div>}</div>
            </div>
          </header>

          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-8">
            <div className="flex-1 overflow-y-auto py-8 sm:py-12">
              <div className="mx-auto max-w-3xl">
                {messages.length === 1 && <div className="mb-10"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6600] text-white shadow-[0_10px_30px_rgba(255,102,0,0.22)]"><Bot className="h-6 w-6" /></div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ff6600]">Good morning</p><h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-0.04em] text-slate-900 sm:text-4xl dark:text-white">What would you like to understand today?</h2><p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">Choose a focus area or ask a question in your own words. Answers are grounded in the data your account is authorized to access.</p></div>}
                <div className="space-y-6">{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}><div className={`flex max-w-[88%] gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>{message.role === "assistant" ? <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#ff6600] text-white"><Bot className="h-4 w-4" /></div> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">You</div>}<div className={`${message.role === "user" ? "rounded-2xl rounded-tr-sm bg-slate-900 text-white dark:bg-slate-700" : "rounded-2xl rounded-tl-sm border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"} px-4 py-3 text-sm leading-6 shadow-sm`}><p>{message.content}</p>{message.source && <p className="mt-3 border-t border-slate-200/70 pt-2 text-[11px] text-slate-400 dark:border-slate-700">Source: {message.source}</p>}</div></div></div>)}</div>
                {messages.length === 1 && <div className="mt-10 grid gap-3 sm:grid-cols-2">{quickPrompts.map(({ label, icon: Icon, prompt }) => <button key={label} onClick={() => sendMessage(undefined, prompt)} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-[#ff6600]/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"><Icon className="h-4 w-4 text-[#ff6600] transition-transform group-hover:scale-110" />{label}<ArrowUp className="ml-auto h-4 w-4 rotate-45 text-slate-300" /></button>)}</div>}
              </div>
            </div>

            <div className="pb-6 sm:pb-8"><form onSubmit={sendMessage} className="mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_12px_35px_rgba(15,23,42,0.08)] focus-within:border-[#ff6600] focus-within:ring-4 focus-within:ring-[#ff6600]/10 dark:border-slate-700 dark:bg-slate-900"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} placeholder={`Ask about ${activeContext}...`} className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none placeholder:text-slate-400" /><div className="flex items-center justify-between px-2 pb-1"><div className="flex items-center gap-1"><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Attach a file"><Paperclip className="h-4 w-4" /></button><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Use voice input"><Mic className="h-4 w-4" /></button><span className="ml-2 hidden text-[11px] text-slate-400 sm:block">{isSending ? `${activeProvider === "openai" ? "OpenAI" : "Claude"} is thinking...` : "DMCFS AI uses authorized enterprise data"}</span></div><button type="submit" disabled={!input.trim() || isSending} className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6600] text-white transition hover:bg-[#e85b00] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message"><ArrowUp className="h-4 w-4" /></button></div></form><p className="mt-3 text-center text-[11px] text-slate-400">AI responses can be reviewed against their displayed source context.</p></div>
          </div>
        </section>
      </div>
    </main>
  );
}
