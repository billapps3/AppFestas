import { useRef, useState } from "react";
import { FileDown, Image as ImageIcon, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReportGuest = {
  name: string;
  status: "Confirmado" | "Aguardando" | "Declinado";
  child: boolean;
  family: string;
  host: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: ReportGuest[];
  hosts: string[];
  isGroupFamily: (family: string) => boolean;
  eventName: string;
  eventDate?: string;
};

// Exported document surface: fixed light palette so the PDF/JPG looks the same
// regardless of the theme the user is browsing in.
const ink = "#2b2430";
const soft = "#7c7185";
const line = "#e7dfe9";
const accent = "#b3446b";
const mark = { Confirmado: "✓", Aguardando: "•", Declinado: "✕" } as const;
const markColor = { Confirmado: "#1f7a52", Aguardando: "#c2620c", Declinado: "#c0322f" } as const;

function buildSections(guests: ReportGuest[], hosts: string[]) {
  return [...hosts, "Sem responsável"]
    .map((host) => {
      const people = guests.filter((guest) =>
        host === "Sem responsável" ? !guest.host : guest.host === host,
      );
      const families = Array.from(
        new Set(people.filter((guest) => guest.family).map((guest) => guest.family)),
      )
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .map((family) => ({
          family,
          people: [
            ...people.filter((guest) => guest.name === family),
            ...people
              .filter((guest) => guest.family === family && guest.name !== family)
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
          ],
        }));
      const singles = people
        .filter((guest) => !guest.family)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      return { host, people, families, singles };
    })
    .filter((section) => section.people.length > 0);
}

const count = (people: ReportGuest[], status: ReportGuest["status"]) =>
  people.filter((guest) => guest.status === status).length;

function Tally({ people }: { people: ReportGuest[] }) {
  return (
    <span style={{ color: soft, fontSize: 10, whiteSpace: "nowrap" }}>
      {people.length} ·{" "}
      <span style={{ color: markColor.Confirmado }}>{count(people, "Confirmado")}✓</span>{" "}
      <span style={{ color: markColor.Aguardando }}>{count(people, "Aguardando")}•</span>{" "}
      <span style={{ color: markColor.Declinado }}>{count(people, "Declinado")}✕</span>
    </span>
  );
}

function NameList({ people }: { people: ReportGuest[] }) {
  return (
    <div style={{ fontSize: 10.5, color: ink }}>
      {people.map((guest, index) => (
        <div
          key={guest.name + index}
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
            padding: "2px 0",
            borderTop: index === 0 ? "none" : `1px solid ${line}`,
            breakInside: "avoid",
          }}
        >
          <span>
            <span style={{ color: markColor[guest.status], fontWeight: 700 }}>
              {mark[guest.status]}
            </span>{" "}
            <span>{guest.name}</span>
            {guest.child && <span style={{ color: soft }}> · criança</span>}
          </span>
          <span style={{ color: markColor[guest.status], fontSize: 9.5, whiteSpace: "nowrap" }}>
            {guest.status}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GuestReportDialog({
  open,
  onOpenChange,
  guests,
  hosts,
  isGroupFamily,
  eventName,
  eventDate,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"pdf" | "jpg" | "share" | null>(null);
  const [error, setError] = useState("");
  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function";

  const sections = buildSections(guests, hosts);
  const children = guests.filter((guest) => guest.child).length;
  const declined = count(guests, "Declinado");
  const metrics = [
    { label: "Convidados", value: guests.length },
    { label: "Confirmados", value: count(guests, "Confirmado") },
    { label: "Aguardando", value: count(guests, "Aguardando") },
    { label: "Declinados", value: declined },
    { label: "Crianças até 10", value: children },
    { label: "Saldo pagantes", value: guests.length - children - declined, highlight: true },
  ];

  const capture = async () => {
    const node = sheetRef.current!;
    const { toPng } = await import("html-to-image");
    return toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: node.scrollWidth,
      height: node.scrollHeight,
    });
  };

  const download = (href: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
  };

  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string) =>
    new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error(`Tempo esgotado (${label})`)), ms);
      promise.then(
        (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          window.clearTimeout(timer);
          reject(err);
        },
      );
    });

  const buildJpgCanvas = async () => {
    const png = await withTimeout(capture(), 20000, "gerando imagem");
    const image = new Image();
    image.src = png;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    return canvas;
  };

  const canvasToBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
        "image/jpeg",
        0.94,
      );
    });

  const exportJpg = async () => {
    setBusy("jpg");
    setError("");
    try {
      const canvas = await buildJpgCanvas();
      download(canvas.toDataURL("image/jpeg", 0.94), `convidados-${slug}.jpg`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o JPG.");
    } finally {
      setBusy(null);
    }
  };

  const shareReport = async () => {
    setBusy("share");
    setError("");
    try {
      const canvas = await buildJpgCanvas();
      const blob = await canvasToBlob(canvas);
      const file = new File([blob], `convidados-${slug}.jpg`, { type: "image/jpeg" });
      if (!navigator.canShare({ files: [file] })) {
        download(canvas.toDataURL("image/jpeg", 0.94), `convidados-${slug}.jpg`);
        setError("Este navegador não permite compartilhar arquivos direto — baixei o JPG em vez disso.");
        return;
      }
      await withTimeout(
        navigator.share({
          files: [file],
          title: `Relatório de convidados — ${eventName}`,
        }),
        60000,
        "abrindo o menu de compartilhar",
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? `Não foi possível compartilhar: ${err.message}` : "Não foi possível compartilhar.");
    } finally {
      setBusy(null);
    }
  };

  const exportPdf = async () => {
    setBusy("pdf");
    setError("");
    try {
      const png = await withTimeout(capture(), 20000, "gerando imagem");
      const image = new Image();
      image.src = png;
      await image.decode();
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const usableWidth = pageWidth - margin * 2;
      const scale = usableWidth / image.width;
      const sliceHeight = Math.floor((pageHeight - margin * 2) / scale);

      let offset = 0;
      let page = 0;
      while (offset < image.height) {
        const height = Math.min(sliceHeight, image.height - offset);
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, -offset);
        if (page > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.92),
          "JPEG",
          margin,
          margin,
          usableWidth,
          height * scale,
        );
        offset += height;
        page += 1;
      }
      pdf.save(`convidados-${slug}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o PDF.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-4 sm:p-5">
          <DialogTitle className="text-base">Relatório executivo de convidados</DialogTitle>
          <DialogDescription className="text-xs">
            Números no topo e a lista consolidada por responsável e por família.
          </DialogDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            {canShareFiles && (
              <Button size="sm" className="gap-1.5" disabled={busy !== null} onClick={() => void shareReport()}>
                {busy === "share" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Share2 className="size-4" />
                )}
                Compartilhar
              </Button>
            )}
            <Button
              size="sm"
              variant={canShareFiles ? "outline" : "default"}
              className="gap-1.5"
              disabled={busy !== null}
              onClick={() => void exportPdf()}
            >
              {busy === "pdf" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              Baixar PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={busy !== null}
              onClick={() => void exportJpg()}
            >
              {busy === "jpg" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
              Baixar JPG
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </DialogHeader>

        <div className="max-h-[68vh] overflow-auto bg-muted/40 p-3 sm:p-4">
          <div
            ref={sheetRef}
            style={{
              width: 900,
              background: "#ffffff",
              color: ink,
              padding: 22,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                borderBottom: `2px solid ${accent}`,
                paddingBottom: 8,
              }}
            >
              <div>
                <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: soft }}>
                  Relatório de convidados
                </div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{eventName}</div>
              </div>
              <div style={{ fontSize: 9.5, color: soft, textAlign: "right" }}>
                {eventDate && <div>Festa: {eventDate}</div>}
                <div>Emitido em {new Date().toLocaleDateString("pt-BR")}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    flex: 1,
                    border: `1px solid ${metric.highlight ? accent : line}`,
                    background: metric.highlight ? "#fdf2f6" : "#ffffff",
                    borderRadius: 8,
                    padding: "7px 9px",
                  }}
                >
                  <div style={{ fontSize: 8.5, textTransform: "uppercase", letterSpacing: 0.7, color: soft }}>
                    {metric.label}
                  </div>
                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 700,
                      lineHeight: 1.15,
                      color: metric.highlight ? accent : ink,
                    }}
                  >
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 6, fontSize: 8.5, color: soft }}>
              Saldo pagantes = convidados − crianças até 10 anos − declinados. Legenda:{" "}
              <span style={{ color: markColor.Confirmado }}>✓ confirmado</span> ·{" "}
              <span style={{ color: markColor.Aguardando }}>• aguardando</span> ·{" "}
              <span style={{ color: markColor.Declinado }}>✕ declinado</span>
            </div>

            {sections.map((section) => (
              <div key={section.host} style={{ marginTop: 14, breakInside: "avoid" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#faf5f7",
                    border: `1px solid ${line}`,
                    borderRadius: 6,
                    padding: "5px 9px",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{section.host}</div>
                  <Tally people={section.people} />
                </div>

                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {section.families.map(({ family, people }) => (
                    <div
                      key={family}
                      style={{
                        width: "calc(50% - 3px)",
                        boxSizing: "border-box",
                        border: `1px solid ${line}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        breakInside: "avoid",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 6,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700 }}>
                          {family}
                          <span style={{ fontWeight: 400, fontSize: 9, color: soft }}>
                            {isGroupFamily(family) ? " · grupo" : " · família"}
                          </span>
                        </div>
                        <Tally people={people} />
                      </div>
                      <div style={{ marginTop: 3 }}>
                        <NameList people={people} />
                      </div>
                    </div>
                  ))}

                  {section.singles.length > 0 && (
                    <div
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        border: `1px solid ${line}`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        breakInside: "avoid",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700 }}>Individuais</div>
                        <Tally people={section.singles} />
                      </div>
                      <div
                        style={{
                          marginTop: 3,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          columnGap: 14,
                        }}
                      >
                        <NameList people={section.singles.slice(0, Math.ceil(section.singles.length / 2))} />
                        <NameList people={section.singles.slice(Math.ceil(section.singles.length / 2))} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}