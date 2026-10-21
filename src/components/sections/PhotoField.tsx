"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PHOTO_ACCEPT } from "@/lib/leads/constants";
import { preparePhoto } from "@/lib/leads/photo-client";

const CLIENT_ERROR_TEXT = {
  invalid: "Подходят только фото JPG, PNG или WebP.",
  too_large: "Фото слишком большое: не более 20 МБ.",
} as const;

/**
 * Фото отправления: выбор из галереи или камеры, вставка из буфера (Cmd/Ctrl+V
 * в любом месте формы) и перетаскивание. Перед отправкой фото сжимается в браузере
 * и подменяется в самом <input name="photo">, поэтому форма уходит как обычно.
 */
export function PhotoField({
  serverError,
  onBusyChange,
}: {
  serverError?: string;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Ошибка сервера относится к прошлой попытке: после нового выбора её не показываем.
  const [touched, setTouched] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  function setInputFile(file: File | null) {
    const input = inputRef.current;
    if (!input) return;
    if (!file) {
      input.value = "";
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
  }

  async function accept(file: File, originalName: string) {
    setTouched(true);
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      const result = await preparePhoto(file);
      if (!result.ok) {
        setInputFile(null);
        setPreview(null);
        setError(CLIENT_ERROR_TEXT[result.code]);
        return;
      }
      setInputFile(result.file);
      setPreview({ url: URL.createObjectURL(result.file), name: originalName });
    } catch {
      // DataTransfer недоступен (очень старый браузер): оставляем выбранный файл как есть,
      // сервер проверит размер и тип.
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }

  function remove() {
    setTouched(true);
    setInputFile(null);
    setPreview(null);
    setError(null);
  }

  // Вставка картинки из буфера в любом месте формы. Текст вставляется как обычно.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith("image/"),
      );
      if (!file) return;
      event.preventDefault();
      void accept(file, file.name || "Вставленное изображение");
    }
    form.addEventListener("paste", onPaste);
    return () => form.removeEventListener("paste", onPaste);
    // accept не зависит от пропсов, кроме onBusyChange, а тот стабилен
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shownError = error ?? (touched ? undefined : serverError);

  return (
    <div>
      <label
        htmlFor="photo"
        className="mb-3 block font-mono text-[11px] uppercase tracking-label text-ink-muted"
      >
        Фото отправления
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void accept(file, file.name);
        }}
        className={`relative rounded-xl border border-dashed bg-bg/40 transition ${
          dragOver ? "border-brand bg-brand/10" : "border-hairline-strong"
        } ${shownError ? "border-red-400/70" : ""}`}
      >
        <input
          ref={inputRef}
          id="photo"
          name="photo"
          type="file"
          accept={PHOTO_ACCEPT}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (file) void accept(file, file.name);
            else remove();
          }}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? "photo-error" : "photo-hint"}
          className="peer sr-only"
        />

        {preview ? (
          <div className="flex items-center gap-4 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL, next/image не нужен */}
            <img
              src={preview.url}
              alt="Выбранное фото"
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-muted">{preview.name}</span>
            <label
              htmlFor="photo"
              className="cursor-pointer rounded-full px-3 py-2 font-mono text-[11px] uppercase tracking-label text-ink-muted transition hover:text-ink"
            >
              Заменить
            </label>
            <button
              type="button"
              onClick={remove}
              aria-label="Удалить фото"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-ink/5 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <label
            htmlFor="photo"
            className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6 text-center peer-focus-visible:ring-2 peer-focus-visible:ring-brand/60"
          >
            <ImagePlus size={22} className="text-brand-glow" />
            <span className="text-sm text-ink">
              {busy ? "Обрабатываем фото…" : "Сфотографируйте или выберите фото"}
            </span>
            <span className="hidden text-xs text-ink-dim md:block">
              или перетащите сюда, или вставьте через Cmd/Ctrl+V
            </span>
          </label>
        )}
      </div>

      <p id="photo-hint" className="mt-2 text-xs text-ink-dim">
        JPG, PNG, WebP
      </p>
      {shownError && (
        <p id="photo-error" className="mt-2 text-sm text-red-400">
          {shownError}
        </p>
      )}
    </div>
  );
}
