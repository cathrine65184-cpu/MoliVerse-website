"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Minus, Plus } from 'lucide-react';
import type { ImportedContentDraft } from '@/lib/contentImportStorage';
import { withBasePath } from '@/lib/paths';

function savedPageKey(ownerId: string, draft: ImportedContentDraft) {
  return `moliverse:private-pdf-page:${ownerId}:${draft.id}:v${draft.version}`;
}

export default function PrivatePdfReader({ draft, ownerId }: { draft: ImportedContentDraft; ownerId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<any>(null);
  const renderRef = useRef<any>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(draft.pageCount || 0);
  const [scale, setScale] = useState(.45);
  const [documentReady, setDocumentReady] = useState(false);
  const [status, setStatus] = useState('Opening the private PDF…');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!draft.fileBlob) { setStatus('The original file is not available on this device. Import it again from Educator Library.'); return; }
      try {
        setDocumentReady(false);
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = withBasePath('/pdfjs/pdf.worker.min.mjs');
        const task = pdfjs.getDocument({ data: await draft.fileBlob.arrayBuffer() });
        const doc = await task.promise;
        if (cancelled) { await doc.destroy(); return; }
        documentRef.current = doc;
        setPageCount(doc.numPages);
        const saved = Number(localStorage.getItem(savedPageKey(ownerId, draft)) || 1);
        setPage(Math.max(1, Math.min(doc.numPages, saved)));
        setDocumentReady(true);
        setStatus('');
      } catch { setStatus('This PDF could not be opened. The private source remains saved in Educator Library.'); }
    })();
    return () => { cancelled = true; renderRef.current?.cancel?.(); void documentRef.current?.destroy?.(); documentRef.current = null; };
  }, [draft, ownerId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const doc = documentRef.current; const canvas = canvasRef.current;
      if (!documentReady || !doc || !canvas) return;
      try {
        renderRef.current?.cancel?.();
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.aspectRatio = `${viewport.width}/${viewport.height}`;
        const context = canvas.getContext('2d'); if (!context) return;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        renderRef.current = pdfPage.render({ canvasContext: context, viewport });
        await renderRef.current.promise;
        localStorage.setItem(savedPageKey(ownerId, draft), String(page));
      } catch (error: any) { if (error?.name !== 'RenderingCancelledException') setStatus('This page could not be rendered. Try the previous or next page.'); }
    })();
    return () => { cancelled = true; renderRef.current?.cancel?.(); };
  }, [page, scale, draft, ownerId, documentReady]);

  return <article className="private-pdf-reader">
    <header className="private-pdf-title"><div><span className="private-pill"><LockKeyhole size={13}/>Private on this device</span><h1>{draft.title}</h1><p>{draft.language} · Ages {draft.suggestedAgeRange} · {draft.proficiencyLevel}</p></div><div className="pdf-zoom" aria-label="PDF zoom"><button onClick={() => setScale(value => Math.max(.28, value - .08))} aria-label="Zoom out"><Minus/></button><span>{Math.round(scale / .45 * 100)}%</span><button onClick={() => setScale(value => Math.min(.85, value + .08))} aria-label="Zoom in"><Plus/></button></div></header>
    <aside className="private-source-note"><LockKeyhole/><div><strong>Private imported material</strong><p>This scan is rendered from the original file stored in this browser. It is not published, indexed or sent to Moli. OCR is still required before word help or story creation can use its text.</p></div></aside>
    <section className="pdf-stage" aria-live="polite">{status && <p className="pdf-status">{status}</p>}<canvas ref={canvasRef} aria-label={`${draft.title}, PDF page ${page}`}/></section>
    <nav className="pdf-page-nav" aria-label="PDF pages"><button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ArrowLeft/>Previous</button><div><strong>Page {page} of {pageCount || '…'}</strong><small>Reading position saves automatically on this device.</small></div><button disabled={!pageCount || page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next<ArrowRight/></button></nav>
    <footer className="source-note"><strong>Source and rights</strong><p>{draft.source || 'Source not supplied'} · {draft.author || 'Author not supplied'} · {draft.edition || 'Edition not supplied'}</p><p>{draft.rightsNotes || 'Rights status has not been confirmed.'}</p></footer>
  </article>;
}
