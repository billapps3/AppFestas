import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "aniversariante" | "user";
type Person = { id: string; name: string; email: string | null; role: Role };

const roleLabel: Record<Role, string> = {
  admin: "Administrador",
  aniversariante: "Aniversariante (sem financeiro)",
  user: "Organizador",
};

export function AccessPanel({ isAdmin }: { isAdmin: boolean }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, email"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setPeople(
      (profiles ?? []).map((profile) => {
        const list = (roles ?? []).filter((row) => row.user_id === profile.id).map((row) => row.role as Role);
        const role: Role = list.includes("admin") ? "admin" : list.includes("aniversariante") ? "aniversariante" : "user";
        return { id: profile.id, name: profile.display_name ?? "Perfil", email: profile.email, role };
      }),
    );
  }, []);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) return null;

  const setRole = async (person: Person, role: Role) => {
    setBusy(person.id);
    await supabase.from("user_roles").delete().eq("user_id", person.id);
    if (role !== "user") await supabase.from("user_roles").insert({ user_id: person.id, role });
    await load();
    setBusy(null);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary" />Acessos e permissões</div>
      <p className="mt-1 text-xs text-muted-foreground">O perfil “Aniversariante” vê apenas tarefas, convidados e um painel sem dados financeiros.</p>
      <div className="mt-4 space-y-3">
        {people.length === 0 && <div className="text-xs text-muted-foreground">Nenhum perfil cadastrado ainda.</div>}
        {people.map((person) => (
          <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{person.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{person.email ?? "—"} · {roleLabel[person.role]}</div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["admin", "user", "aniversariante"] as Role[]).map((role) => (
                <Button key={role} size="sm" variant={person.role === role ? "default" : "outline"} className="text-[11px]" disabled={busy === person.id} onClick={() => void setRole(person, role)}>
                  {role === "admin" ? "Admin" : role === "user" ? "Organizador" : "Aniversariante"}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}