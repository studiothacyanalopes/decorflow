"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSignature,
  Loader2,
  ShieldCheck,
  Upload,
  RotateCcw,
  PencilLine,
} from "lucide-react";

type Signer = {
  id: string;
  name: string;
  status: string;
  require_selfie: boolean;
  require_document_front: boolean;
  require_document_back: boolean;
};

type RequestRow = {
  id: string;
  contract_title: string | null;
  contract_html: string;
  status: string;
};

type PageState = {
  loading: boolean;
  error: string;
};

function dataUrlToBlob(dataUrl: string) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

export default function SignaturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [token, setToken] = useState("");
  const [state, setState] = useState<PageState>({
    loading: true,
    error: "",
  });
  const [signer, setSigner] = useState<Signer | null>(null);
  const [requestRow, setRequestRow] = useState<RequestRow | null>(null);
  const [signatureName, setSignatureName] = useState("");
  const [signatureDocument, setSignatureDocument] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasDrawnRef = useRef(false);

  useEffect(() => {
    params.then(({ token }) => setToken(token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    void loadSignature();
  }, [token]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    return () => {
      window.removeEventListener("resize", setupCanvas);
    };
  }, [state.loading]);

  function setupCanvas() {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = wrapper.clientWidth;
    const height = 180;

    const previous = hasDrawnRef.current ? canvas.toDataURL("image/png") : null;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";

    if (previous) {
      const image = new Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height);
      };
      image.src = previous;
    }
  }

  function getCanvasCoordinates(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }

    if ("changedTouches" in event && event.changedTouches.length > 0) {
      return {
        x: event.changedTouches[0].clientX - rect.left,
        y: event.changedTouches[0].clientY - rect.top,
      };
    }

    return {
      x: (event as React.MouseEvent<HTMLCanvasElement>).clientX - rect.left,
      y: (event as React.MouseEvent<HTMLCanvasElement>).clientY - rect.top,
    };
  }

  function startDrawing(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(event);

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
    hasDrawnRef.current = true;
  }

  function draw(
    event:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    isDrawingRef.current = false;
  }

  function clearSignature() {
    hasDrawnRef.current = false;
    setupCanvas();
  }

  async function loadSignature() {
    try {
      setState({ loading: true, error: "" });

      const response = await fetch(`/api/contracts/signature/${token}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setState({
          loading: false,
          error: data?.error || "Não foi possível carregar a assinatura.",
        });
        return;
      }

      setSigner(data.signer);
      setRequestRow(data.request);
      setSignatureName(data.signer?.name || "");
      setState({ loading: false, error: "" });
    } catch {
      setState({
        loading: false,
        error: "Erro inesperado ao abrir o link de assinatura.",
      });
    }
  }

  async function handleSubmit() {
    if (!token) return;

    try {
      setSaving(true);
      setResultMessage("");

      if (!accepted) {
        setResultMessage("Você precisa aceitar os termos antes de assinar.");
        return;
      }

      if (!signatureName.trim()) {
        setResultMessage("Informe o nome para assinatura.");
        return;
      }

      if (!hasDrawnRef.current || !canvasRef.current) {
        setResultMessage("Faça sua assinatura no campo de assinatura.");
        return;
      }

      const formData = new FormData();
      formData.append("signature_name", signatureName);
      formData.append("signature_document", signatureDocument);
      formData.append("accepted", String(accepted));

      const signatureBlob = dataUrlToBlob(
        canvasRef.current.toDataURL("image/png")
      );
      formData.append("signature_image", signatureBlob, "signature.png");

      if (selfie) formData.append("selfie", selfie);
      if (documentFront) formData.append("document_front", documentFront);
      if (documentBack) formData.append("document_back", documentBack);

      const response = await fetch(`/api/contracts/signature/${token}/sign`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setResultMessage(
          data?.error || "Não foi possível concluir a assinatura."
        );
        return;
      }

      setResultMessage(
        data?.fully_signed
          ? "Assinatura concluída com sucesso. Documento finalizado."
          : "Sua assinatura foi registrada com sucesso."
      );

      await loadSignature();
    } finally {
      setSaving(false);
    }
  }

  const title = useMemo(() => {
    return requestRow?.contract_title || "Contrato digital";
  }, [requestRow]);

  if (state.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando documento...
        </div>
      </main>
    );
  }

  if (state.error || !signer || !requestRow) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3 text-rose-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-base font-semibold">Link indisponível</p>
              <p className="mt-2 text-sm">{state.error || "Não encontrado."}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
              <FileSignature className="h-3.5 w-3.5" />
              Assinatura digital
            </div>
            <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Leia o documento abaixo e conclua sua assinatura digital.
            </p>
          </div>

          <div
            className="min-h-[900px] bg-white p-0"
            dangerouslySetInnerHTML={{ __html: requestRow.contract_html }}
          />
        </section>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Assinante</p>
                <p className="text-sm text-slate-500">{signer.name}</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Nome para assinatura
                </label>
                <input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Documento
                </label>
                <input
                  value={signatureDocument}
                  onChange={(e) => setSignatureDocument(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400"
                  placeholder="CPF ou documento"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-900">
                    Assinatura com o dedo
                  </label>

                  <button
                    type="button"
                    onClick={clearSignature}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Limpar
                  </button>
                </div>

                <div
                  ref={wrapperRef}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <canvas
                    ref={canvasRef}
                    className="block w-full touch-none bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>

                <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-400">
                  <PencilLine className="h-3.5 w-3.5" />
                  No celular, assine com o dedo diretamente na tela.
                </div>
              </div>

              {signer.require_selfie ? (
                <UploadField
                  label="Selfie"
                  buttonText={selfie ? selfie.name : "Tirar selfie agora"}
                  captureMode="user"
                  onChange={(file) => setSelfie(file)}
                />
              ) : null}

              {signer.require_document_front ? (
                <UploadField
                  label="Frente do documento"
                  buttonText={
                    documentFront
                      ? documentFront.name
                      : "Fotografar frente do documento"
                  }
                  captureMode="environment"
                  onChange={(file) => setDocumentFront(file)}
                />
              ) : null}

              {signer.require_document_back ? (
                <UploadField
                  label="Verso do documento"
                  buttonText={
                    documentBack
                      ? documentBack.name
                      : "Fotografar verso do documento"
                  }
                  captureMode="environment"
                  onChange={(file) => setDocumentBack(file)}
                />
              ) : null}

              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm leading-6 text-slate-700">
                  Declaro que li o documento e concordo com os termos apresentados.
                </span>
              </label>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Assinar digitalmente
              </button>

              {resultMessage ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    resultMessage.toLowerCase().includes("sucesso")
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {resultMessage}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function UploadField({
  label,
  onChange,
  buttonText,
  captureMode,
}: {
  label: string;
  onChange: (file: File | null) => void;
  buttonText: string;
  captureMode?: "user" | "environment";
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-900">
        {label}
      </label>

      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-600">
        <Upload className="h-4 w-4" />
        {buttonText}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          capture={captureMode}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}