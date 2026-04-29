import { useState, useEffect, useCallback } from 'react';

let _show;
export const toast = (msg, dur = 2500) => _show?.(msg, dur);

export default function Toast() {
  const [state, setState] = useState({ msg: '', visible: false });

  useEffect(() => {
    let t;
    _show = (msg, dur) => {
      setState({ msg, visible: true });
      clearTimeout(t);
      t = setTimeout(() => setState(s => ({ ...s, visible: false })), dur);
    };
  }, []);

  return (
    <div className={`toast ${state.visible ? 'show' : ''}`}>{state.msg}</div>
  );
}
