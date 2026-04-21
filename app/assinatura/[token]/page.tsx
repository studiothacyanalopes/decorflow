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
  FileText,
  SquarePen,
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

function normalizeContractHtmlForMobile(html: string) {
  if (!html) return "";

  let output = html;

  const replacements: Array<[RegExp, string]> = [
    [/display:\s*grid/gi, "display:block"],
    [/display:\s*flex/gi, "display:block"],
    [/grid-template-columns\s*:[^;]+;?/gi, ""],
    [/flex-wrap\s*:[^;]+;?/gi, ""],
    [/justify-content\s*:[^;]+;?/gi, ""],
    [/align-items\s*:[^;]+;?/gi, ""],
    [/width:\s*(48|49|50|33|32|31|30|29|28|27|26|25)%/gi, "width:100%"],
    [/min-width\s*:[^;]+;?/gi, "min-width:0;"],
    [/max-width\s*:[^;]+;?/gi, "max-width:100%;"],
    [/height:\s*[^;]+;?/gi, ""],
    [/font-size:\s*32px/gi, "font-size:28px"],
    [/font-size:\s*28px/gi, "font-size:24px"],
    [/font-size:\s*24px/gi, "font-size:20px"],
    [/padding:\s*24px/gi, "padding:16px"],
    [/padding:\s*20px/gi, "padding:14px"],
    [/border-radius:\s*24px/gi, "border-radius:18px"],
    [/border-radius:\s*20px/gi, "border-radius:16px"],
  ];

  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }

  return output;
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function buildWhatsAppUrl(phone?: string | null, text?: string) {
  const clean = normalizePhone(phone);
  if (!clean) return "";

  const full = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text || "Olá!")}`;
}

function isEmbeddedMobileBrowser() {
  const ua = navigator.userAgent || "";
  return /Instagram|FBAN|FBAV|Messenger|Line|TikTok|Twitter/i.test(ua);
}

function extractCompanyDataFromContractHtml(html?: string | null) {
  if (!html) {
    return {
      companyName: "",
      companyPhone: "",
    };
  }


  const locadorSectionMatch = html.match(/Locador[\s\S]*?(?=<\/div>\s*<div style="text-align:right;">|Pedido)/i);
  const locadorSection = locadorSectionMatch?.[0] || html;

  const nameMatch =
    locadorSection.match(/<div style="font-size:26px;font-weight:700;margin-top:6px;">([\s\S]*?)<\/div>/i) ||
    locadorSection.match(/Locador[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i);

  const phoneMatch = locadorSection.match(/Telefone:\s*([^<\n\r]+)/i);

  const rawName = nameMatch?.[1]
    ?.replace(/<br\s*\/?>/gi, " ")
    ?.replace(/<[^>]+>/g, "")
    ?.replace(/&nbsp;/gi, " ")
    ?.trim() || "";

  const rawPhone = phoneMatch?.[1]?.trim() || "";

  return {
    companyName: rawName,
    companyPhone: normalizePhone(rawPhone),
  };
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
  const [postSignWhatsAppUrl, setPostSignWhatsAppUrl] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<"documento" | "assinatura">(
    "documento"
  );

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
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  setIsMobile(isMobileDevice);
}, []);

  useEffect(() => {
    const run = () => setupCanvas();
    run();
    window.addEventListener("resize", run);

    return () => {
      window.removeEventListener("resize", run);
    };
  }, [state.loading, isMobile, mobileTab]);

  function setupCanvas() {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = wrapper.clientWidth;
    const height = window.innerWidth < 640 ? 170 : 210;
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
    if ("preventDefault" in event) event.preventDefault();

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
    if ("preventDefault" in event) event.preventDefault();

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

      if (
        requestRow?.status?.toLowerCase() === "signed" ||
        signer?.status?.toLowerCase() === "signed"
      ) {
        setResultMessage(
          "Este contrato já foi assinado. Se precisar, use o botão abaixo para avisar a empresa no WhatsApp."
        );
        return;
      }

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

      function sanitizeFileName(name: string) {
        return name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9.-]/g, "")
          .toLowerCase();
      }

      const formData = new FormData();
      formData.append("signature_name", signatureName);
      formData.append("signature_document", signatureDocument);
      formData.append("accepted", String(accepted));

      const signatureBlob = dataUrlToBlob(
        canvasRef.current.toDataURL("image/png")
      );
      formData.append("signature_image", signatureBlob, "signature.png");

      if (documentFront) {
        const cleanName = sanitizeFileName(documentFront.name);
        const cleanFile = new File([documentFront], cleanName, {
          type: documentFront.type,
        });
        formData.append("document_front", cleanFile);
      }

      if (documentBack) {
        const cleanName = sanitizeFileName(documentBack.name);
        const cleanFile = new File([documentBack], cleanName, {
          type: documentBack.type,
        });
        formData.append("document_back", cleanFile);
      }

      if (selfie) {
        const cleanName = sanitizeFileName(selfie.name);
        const cleanFile = new File([selfie], cleanName, {
          type: selfie.type,
        });
        formData.append("selfie", cleanFile);
      }

      const response = await fetch(`/api/contracts/signature/${token}/sign`, {
        method: "POST",
        body: formData,
      });

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        setResultMessage(
          "Não foi possível concluir a assinatura. A resposta do servidor veio em formato inválido."
        );
        return;
      }

      if (!response.ok || !data?.ok) {
        setResultMessage(
          data?.error || "Não foi possível concluir a assinatura."
        );
        return;
      }

      const successMessage = data?.fully_signed
        ? "Assinatura concluída com sucesso. Documento finalizado."
        : "Sua assinatura foi registrada com sucesso.";

      const htmlParaExtrair =
        data?.request?.contract_html || requestRow?.contract_html || "";

      const extractedCompanyData =
        extractCompanyDataFromContractHtml(htmlParaExtrair);

      const companyPhone =
        extractedCompanyData.companyPhone || companyWhatsAppPhone || "";

      const companyName =
        extractedCompanyData.companyName || companyWhatsAppName || "empresa";

      const contractTitleValue =
        data?.request?.contract_title ||
        requestRow?.contract_title ||
        "contrato";

      const signerNameValue =
        signatureName?.trim() || signer?.name || "Cliente";

      const signerDocumentValue = signatureDocument?.trim();

      const whatsappMessageFinal = [
        `Olá, ${companyName}!`,
        "",
        `O contrato "${contractTitleValue}" foi assinado digitalmente com sucesso.`,
        `Assinante: ${signerNameValue}`,
        signerDocumentValue ? `Documento: ${signerDocumentValue}` : "",
        "",
        "Peço, por favor, que confirmem o recebimento da assinatura.",
      ]
        .filter(Boolean)
        .join("\n");

      const builtWhatsAppUrl = companyPhone
        ? buildWhatsAppUrl(companyPhone, whatsappMessageFinal)
        : "";

      setPostSignWhatsAppUrl(builtWhatsAppUrl);

      setResultMessage(
        builtWhatsAppUrl
          ? `${successMessage} Agora toque no botão abaixo para notificar a empresa sobre a assinatura.`
          : `${successMessage} Não foi possível montar o link do WhatsApp da empresa.`
      );

      await loadSignature();
    } catch (error) {
      console.error("Erro ao concluir assinatura:", error);
      setResultMessage(
        "Ocorreu um erro ao concluir a assinatura. No celular isso pode acontecer por falha de conexão, upload da imagem ou erro interno do servidor. Tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }

  const title = useMemo(() => {
    return requestRow?.contract_title || "Contrato digital";
  }, [requestRow]);

  const normalizedContractHtml = useMemo(() => {
    if (!requestRow?.contract_html) return "";
    return isMobile
      ? normalizeContractHtmlForMobile(requestRow.contract_html)
      : requestRow.contract_html;
  }, [requestRow, isMobile]);

const companyData = useMemo(() => {
  return extractCompanyDataFromContractHtml(requestRow?.contract_html || "");
}, [requestRow]);

const companyWhatsAppPhone = companyData.companyPhone;
const companyWhatsAppName = companyData.companyName;





const signedWhatsAppMessage = useMemo(() => {
  const signerNameValue = signatureName?.trim() || signer?.name || "Cliente";
  const contractTitleValue = requestRow?.contract_title || "contrato";
  const signerDocumentValue = signatureDocument?.trim();
  const companyNameValue = companyWhatsAppName?.trim() || "empresa";

  return [
    `Olá, ${companyNameValue}!`,
    "",
    `Acabei de assinar digitalmente o contrato "${contractTitleValue}".`,
    `Assinante: ${signerNameValue}`,
    signerDocumentValue ? `Documento: ${signerDocumentValue}` : "",
    "",
    "Peço, por favor, que confirmem o recebimento da assinatura.",
  ]
    .filter(Boolean)
    .join("\n");
}, [signatureName, signatureDocument, signer, requestRow, companyWhatsAppName]);

const signedWhatsAppUrl = useMemo(() => {
  return buildWhatsAppUrl(companyWhatsAppPhone, signedWhatsAppMessage);
}, [companyWhatsAppPhone, signedWhatsAppMessage]);

  if (state.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando documento...
        </div>
      </main>
    );
  }

  if (state.error || !signer || !requestRow) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
        <div className="max-w-lg rounded-[28px] border border-rose-200 bg-white p-6 shadow-sm">
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

  const safeSigner = signer;
  const safeRequestRow = requestRow;




const isAlreadySigned =
  safeRequestRow.status?.toLowerCase() === "signed" ||
  safeSigner.status?.toLowerCase() === "signed";

if (isAlreadySigned) {
  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-3xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Contrato já assinado
            </div>

            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[32px]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Este link já foi utilizado e o contrato já está com assinatura concluída.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoMiniCard label="Assinante" value={safeSigner.name} />
              <InfoMiniCard label="Status" value="Assinado" />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
              Este contrato já foi assinado e, por segurança, o conteúdo completo não pode mais ser visualizado por este link.
              {signedWhatsAppUrl
                ? " Se desejar, você pode avisar a empresa pelo WhatsApp no botão abaixo."
                : ""}
            </div>

                  {signedWhatsAppUrl ? (
  <a
    href={signedWhatsAppUrl}
    target="_self"
    rel="noreferrer"
    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 sm:w-auto"
  >
    Notificar a empresa sobre a assinatura
  </a>
) : null}


          </div>
        </div>
      </div>
    </main>
  );
}


const contractPanelJsx = (
    <section className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Documento do contrato</p>
            <p className="mt-1 text-sm text-slate-500">Visualização completa do contrato para leitura e conferência.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            Leitura antes da assinatura
          </div>
        </div>
      </div>
      <div className="bg-white p-2 sm:p-4 lg:p-5">
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
          <article
            className="contract-html mx-auto w-full max-w-none overflow-x-hidden bg-white p-3 text-slate-800 sm:p-5 lg:p-8 [&_*]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:table-fixed [&_td]:align-top [&_td]:border-slate-200 [&_td]:break-words [&_th]:border-slate-200 [&_th]:break-words [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-[-0.03em] [&_h1]:text-slate-950 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-slate-950 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_p]:leading-7 [&_p]:text-slate-700 [&_strong]:text-slate-950"
            dangerouslySetInnerHTML={{ __html: normalizedContractHtml }}
          />
        </div>
      </div>
    </section>
  );



  const signaturePanelJsx = (
    <aside className="min-w-0">
      <div className="lg:sticky lg:top-6">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">Assinante</p>
                <p className="truncate text-sm text-slate-500">{safeSigner.name}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">

    {isAlreadySigned ? (
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
    Este contrato já foi assinado. Caso precise, você pode avisar a empresa no WhatsApp pelo botão abaixo.
  </div>
) : null}

            <FieldLabel htmlFor="signature-name">Nome para assinatura</FieldLabel>
            <input
              id="signature-name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-400"
              placeholder="Seu nome completo"
            />

            <FieldLabel htmlFor="signature-document">Documento</FieldLabel>
            <input
              id="signature-document"
              value={signatureDocument}
              onChange={(e) => setSignatureDocument(e.target.value)}
              autoComplete="off"
              inputMode="numeric"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-indigo-400"
              placeholder="CPF ou documento"
            />

            <div className="pt-1">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-semibold text-slate-900">Assinatura com o dedo</label>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Limpar
                </button>
              </div>
              <div ref={wrapperRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
              <div className="mt-2 inline-flex items-center gap-2 text-xs leading-5 text-slate-400">
                <PencilLine className="h-3.5 w-3.5 shrink-0" />
                No celular, assine com o dedo diretamente na tela.
              </div>
            </div>

            {safeSigner.require_selfie ? (
              <UploadField label="Selfie" buttonText={selfie ? selfie.name : "Tirar selfie agora"} captureMode="user" onChange={(file) => setSelfie(file)} />
            ) : null}
            {safeSigner.require_document_front ? (
              <UploadField label="Frente do documento" buttonText={documentFront ? documentFront.name : "Fotografar frente do documento"} captureMode="environment" onChange={(file) => setDocumentFront(file)} />
            ) : null}
            {safeSigner.require_document_back ? (
              <UploadField label="Verso do documento" buttonText={documentBack ? documentBack.name : "Fotografar verso do documento"} captureMode="environment" onChange={(file) => setDocumentBack(file)} />
            ) : null}

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 shrink-0" />
              <span className="text-sm leading-6 text-slate-700">Declaro que li o documento e concordo com os termos apresentados.</span>
            </label>

<button
  type="button"
  onClick={handleSubmit}
  disabled={saving || isAlreadySigned}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)] px-4 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(79,70,229,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Assinar digitalmente
            </button>

            {resultMessage ? (
  <div
    className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
      resultMessage.toLowerCase().includes("sucesso")
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-rose-200 bg-rose-50 text-rose-700"
    }`}
  >
    <div>{resultMessage}</div>

{postSignWhatsAppUrl ? (
  <a
    href={postSignWhatsAppUrl}
    target="_self"
    rel="noreferrer"
    className="mt-3 inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
  >
    Notificar a empresa sobre a assinatura
  </a>
) : null}



  </div>
) : null}

          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
        <div className="mb-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:mb-5 sm:px-5 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700">
                <FileSignature className="h-3.5 w-3.5" />
                Assinatura digital
              </div>
              <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[32px]">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Leia o contrato abaixo com atenção e finalize a assinatura digital no formulário.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[360px]">
              <InfoMiniCard label="Assinante" value={safeSigner.name} />
              <InfoMiniCard label="Status" value={safeRequestRow.status || "Pendente"} />
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMobileTab("documento")}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${mobileTab === "documento" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  <FileText className="h-4 w-4" />
                  Documento
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("assinatura")}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${mobileTab === "assinatura" ? "bg-[linear-gradient(135deg,#4f46e5_0%,#6366f1_100%)] text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  <SquarePen className="h-4 w-4" />
                  Assinatura
                </button>
              </div>
            </div>
            <div style={{ display: mobileTab === "documento" ? "block" : "none" }}>
              {contractPanelJsx}
            </div>
            <div style={{ display: mobileTab === "assinatura" ? "block" : "none" }}>
              {signaturePanelJsx}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_420px]">
            {contractPanelJsx}
            {signaturePanelJsx}
          </div>
        )}
      </div>
    </main>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-semibold text-slate-900"
    >
      {children}
    </label>
  );
}

function InfoMiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
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

      <label className="flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <Upload className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 break-words">{buttonText}</span>
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