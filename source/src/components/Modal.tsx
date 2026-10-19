import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

export function Modal({ title, onClose, children,className,style }: { title: string; onClose: () => void; children: ReactNode;className?:string;style?:CSSProperties }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); return () => ref.current?.close(); }, []);
  return <dialog ref={ref} className={className?`modal ${className}`:'modal'} style={style} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose();}}>
    <div className="modal-header"><h2>{title}</h2><button className="button ghost" onClick={onClose} aria-label="Đóng cửa sổ">×</button></div>
    {children}
  </dialog>;
}
