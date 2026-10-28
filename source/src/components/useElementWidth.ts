import {useEffect,useState} from 'react';

/** Measure the scroll viewport, not the table (which can overflow it).
 * clientWidth excludes the vertical scrollbar and follows selected frame size. */
export function useElementWidth(){
  const [element,ref]=useState<HTMLElement|null>(null);
  const [width,setWidth]=useState(0);
  useEffect(()=>{
    if(!element)return;
    const measure=()=>setWidth(element.clientWidth);
    measure();
    if(typeof ResizeObserver==='undefined'){
      window.addEventListener('resize',measure);
      return ()=>window.removeEventListener('resize',measure);
    }
    const observer=new ResizeObserver(measure);
    observer.observe(element);
    return ()=>observer.disconnect();
  },[element]);
  return {ref,width};
}
