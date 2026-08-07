import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — Mirella 15" },
      { name: "description", content: "Acesso ao painel de organização da festa de 15 anos da Mirella." },
      { property: "og:title", content: "Entrar — Mirella 15" },
      { property: "og:description", content: "Acesso restrito à família para organizar a festa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (mode === "criar") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        setMessage("Conta criada! Confira seu e-mail para confirmar o acesso.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/", replace: true });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setMessage("");
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setMessage("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="grid min-h-svh place-items-center bg-muted/40 px-5 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles className="size-4" />Mirella 15</div>
        <h1 className="mt-3 font-serif text-[28px] leading-tight">{mode === "entrar" ? "Entrar no painel" : "Criar seu acesso"}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Acesso da família para organizar a festa de 02/10/2026.</p>

        <div className="mt-6 space-y-3">
          {mode === "criar" && (
            <label className="block text-[11px] text-muted-foreground">Como quer ser chamada(o)
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Mamãe da Mirella" className="mt-1 h-10 text-sm" />
            </label>
          )}
          <label className="block text-[11px] text-muted-foreground">E-mail
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" className="mt-1 h-10 text-sm" />
          </label>
          <label className="block text-[11px] text-muted-foreground">Senha
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" className="mt-1 h-10 text-sm" />
          </label>
          <Button className="w-full" disabled={busy || !email || !password} onClick={submit}>{mode === "entrar" ? "Entrar" : "Criar acesso"}</Button>
          <Button variant="outline" className="w-full" onClick={google}>Entrar com Google</Button>
        </div>

        {message && <p className="mt-4 text-xs text-primary">{message}</p>}

        <button className="mt-5 w-full text-center text-xs text-muted-foreground underline" onClick={() => { setMode(mode === "entrar" ? "criar" : "entrar"); setMessage(""); }}>
          {mode === "entrar" ? "Ainda não tenho acesso — criar conta" : "Já tenho acesso — entrar"}
        </button>
      </div>
    </div>
  );
}
