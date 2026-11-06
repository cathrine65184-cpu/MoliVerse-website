"use client";

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpenCheck, Minus, Plus } from 'lucide-react';
import type { LibraryContent } from '@/lib/contentLibrary';
import type { SavedContentProgress } from './LibraryShell';
import { withBasePath } from '@/lib/paths';
import { paintSheet } from './paperTurn';

export default function PublicPdfReader({ content, progress, onProgress }: { content: LibraryContent; progress: SavedContentProgress; onProgress: (value: SavedContentProgress) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<any>(null);
  const renderRef = useRef<any>(null);
  const shown = useRef<number | null>(null);
  const expectedPages = content.document?.pageCount || 0;
  const [page, setPage] = useState(Math.min(expectedPages || 1, (progress.position || 0) + 1));
  const [pageCount, setPageCount] = useState(expectedPages);
  const [scale, setScale] = useState(.45);
  const [documentReady, setDocumentReady] = useState(false);
  const [status, setStatus] = useState('Opening the book…');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!content.document) return;
      try {
        const moduleUrl = withBasePath('/pdfjs/pdf.min.mjs');
        const pdfjs = await import(/* webpackIgnore: true */ moduleUrl);
        pdfjs.GlobalWorkerOptions.workerSrc = withBasePath('/pdfjs/pdf.worker.min.mjs');
        const doc = await pdfjs.getDocument(withBasePath(content.document.url)).promise;
        if (cancelled) { await doc.destroy(); return; }
        documentRef.current = doc;
        setPageCount(doc.numPages);
        setPage(Math.max(1, Math.min(doc.numPages, (progress.position || 0) + 1)));
        setDocumentReady(true);
        setStatus('');
      } catch (error) {
        console.error('public PDF reader failed', error);
        setStatus('This book could not be opened. Please refresh and try again.');
      }
    })();
    return () => { cancelled = true; renderRef.current?.cancel?.(); void documentRef.current?.destroy?.(); documentRef.current = null; };
  }, [content.id, content.version]);

  useEffect(() => {
    if (!documentReady || !pageCount) return;
    const restoredPage = Math.max(1, Math.min(pageCount, (progress.position || 0) + 1));
    setPage(current => current === restoredPage ? current : restoredPage);
  }, [documentReady, pageCount, progress.position]);

  useEffect(() => {
    let cancelled = false;
    let finishTurn: (() => void) | undefined;
    void (async () => {
      const doc = documentRef.current;
      const canvas = canvasRef.current;
      if (!documentReady || !doc || !canvas) return;
      try {
        renderRef.current?.cancel?.();
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const raster = document.createElement('canvas');
        raster.width = Math.ceil(viewport.width * ratio);
        raster.height = Math.ceil(viewport.height * ratio);
        const context = raster.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        renderRef.current = pdfPage.render({ canvasContext: context, viewport, transform: [ratio,0,0,ratio,0,0] });
        await renderRef.current.promise;
        if (cancelled) return;
        finishTurn = paintSheet(canvas, raster, shown.current === null ? 0 : Math.sign(page - shown.current));
        shown.current = page;
        setStatus('');
        onProgress({ ...progress, position: page - 1, completed: page === pageCount, updatedAt: new Date().toISOString() });
      } catch (error: any) {
        if (error?.name !== 'RenderingCancelledException') setStatus('This page could not be rendered. Try the previous or next page.');
      }
    })();
    return () => { cancelled = true; finishTurn?.(); renderRef.current?.cancel?.(); };
  }, [page, scale, documentReady]);

  return <article className="private-pdf-reader public-pdf-reader">
    <header className="private-pdf-title"><div><span className="public-reading-pill"><BookOpenCheck size={14}/>Licensed public reading</span><h1>{content.title}</h1><p>{content.language} · Ages {content.suggestedAgeRange} · {content.proficiencyLevel}</p></div><div className="pdf-zoom" aria-label="PDF zoom"><button onClick={() => setScale(value => Math.max(.28, value - .08))} aria-label="Zoom out"><Minus/></button><span>{Math.round(scale / .45 * 100)}%</span><button onClick={() => setScale(value => Math.min(.85, value + .08))} aria-label="Zoom in"><Plus/></button></div></header>
    <aside className="public-source-note"><BookOpenCheck/><div><strong>Public reading edition</strong><p>This book is available to read in MoliVerse following confirmation of public-display authorisation. Copyright remains with the original rights holders.</p></div></aside>
    <section className="pdf-stage" aria-live="polite">{status && <p className="pdf-status">{status}</p>}<canvas ref={canvasRef} aria-label={`${content.title}, PDF page ${page}`}/></section>
    <nav className="pdf-page-nav" aria-label="PDF pages"><button disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ArrowLeft/>Previous</button><div><strong>Page {page} of {pageCount || '…'}</strong><small>Your reading position saves automatically on this device.</small></div><button disabled={!pageCount || page >= pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}>Next<ArrowRight/></button></nav>
    <footer className="source-note"><strong>Source and rights</strong><p>{content.source.name} · {content.source.author} · {content.source.edition}</p><p>{content.source.rightsNotes}</p></footer>
  </article>;
}
