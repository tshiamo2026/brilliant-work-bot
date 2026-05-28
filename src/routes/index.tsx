import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { Toaster, toast } from "sonner";
import {
  Mail,
  FileText,
  ListChecks,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  Copy,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Workplace Productivity Assistant" },
      {
        name: "description",
        content:
          "Automate emails, summarize meetings, plan tasks, and research topics with AI.",
      },
    ],
  }),
  component: Dashboard,
});

type FeatureKey = "email" | "summary" | "planner" | "research" | "chat";

const NAV: { key: FeatureKey; label: string; icon: any; desc: string }[] = [
  { key: "email", label: "Email Generator", icon: Mail, desc: "Tone & audience aware drafts" },
  { key: "summary", label: "Meeting Summarizer", icon: FileText, desc: "Key points, actions, deadlines" },
  { key: "planner", label: "Task Planner", icon: ListChecks, desc: "Prioritize & schedule" },
  { key: "research", label: "Research Assistant", icon: Search, desc: "Insights & briefings" },
  { key: "chat", label: "AI Chatbot", icon: MessageSquare, desc: "Conversational assistant" },
];

function Dashboard() {
  const [active, setActive] = useState<FeatureKey>("email");

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Toaster richColors position="top-right" />
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-6 py-5 border-b">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">AI Workplace</div>
            <div className="text-xs text-muted-foreground">Productivity Assistant</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="m-3 rounded-lg border bg-card p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Disclaimer
          </div>
          AI-generated content may require human review.
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile nav */}
        <div className="md:hidden border-b bg-background p-3 flex gap-2 overflow-x-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => setActive(item.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap border",
                  active === item.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <header className="border-b bg-background px-6 py-4">
          <h1 className="text-xl font-semibold">
            {NAV.find((n) => n.key === active)?.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            {NAV.find((n) => n.key === active)?.desc}
          </p>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {active === "email" && <EmailFeature />}
          {active === "summary" && <SimpleFeature feature="summary" placeholder="Paste your meeting notes or transcript here..." cta="Summarize" />}
          {active === "planner" && <SimpleFeature feature="planner" placeholder="List your tasks, goals, or projects for today..." cta="Plan & Prioritize" />}
          {active === "research" && <SimpleFeature feature="research" placeholder="What topic would you like to research?" cta="Research" />}
          {active === "chat" && <ChatFeature />}
        </div>
      </main>
    </div>
  );
}

async function callAI(payload: Record<string, any>): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ai-assistant", {
    body: payload,
  });
  if (error) {
    // Try to extract structured message
    const msg = (error as any).context?.error || error.message;
    throw new Error(msg || "Request failed");
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.content || "";
}

function OutputCard({ content, loading }: { content: string; loading: boolean }) {
  if (!loading && !content) return null;
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">AI Output</CardTitle>
        {content && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating…
          </div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-table:text-sm">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmailFeature() {
  const [tone, setTone] = useState("Professional");
  const [audience, setAudience] = useState("");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what the email is about.");
      return;
    }
    setLoading(true);
    setOutput("");
    try {
      const content = await callAI({ feature: "email", tone, audience, prompt });
      setOutput(content);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Smart Email Generator</CardTitle>
          <CardDescription>
            Draft polished emails tailored to your tone and audience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Professional", "Friendly", "Formal", "Persuasive", "Apologetic", "Concise", "Enthusiastic"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Input
                placeholder="e.g. Client, CEO, Engineering team"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Purpose / Key points</Label>
            <Textarea
              rows={6}
              placeholder="Describe the purpose of the email and any key points to include..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate Email</>}
          </Button>
        </CardContent>
      </Card>
      <OutputCard content={output} loading={loading} />
    </div>
  );
}

function SimpleFeature({
  feature,
  placeholder,
  cta,
}: {
  feature: FeatureKey;
  placeholder: string;
  cta: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (!prompt.trim()) {
      toast.error("Please provide some input first.");
      return;
    }
    setLoading(true);
    setOutput("");
    try {
      const content = await callAI({ feature, prompt });
      setOutput(content);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Textarea
            rows={10}
            placeholder={placeholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Button onClick={handleRun} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working</> : <><Sparkles className="h-4 w-4 mr-2" /> {cta}</>}
          </Button>
        </CardContent>
      </Card>
      <OutputCard content={output} loading={loading} />
    </div>
  );
}

type ChatMsg = { role: "user" | "assistant"; content: string };

function ChatFeature() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const content = await callAI({ feature: "chat", messages: newMessages });
      setMessages([...newMessages, { role: "assistant", content }]);
    } catch (e: any) {
      toast.error(e.message || "Failed");
      setMessages(newMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl flex flex-col h-[calc(100vh-12rem)]">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Start a conversation with your AI assistant.
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </CardContent>
        <div className="border-t p-3 flex gap-2">
          <Input
            placeholder="Ask anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground text-center mt-2">
        <Badge variant="outline" className="mr-1.5">Disclaimer</Badge>
        AI-generated content may require human review.
      </p>
    </div>
  );
}
