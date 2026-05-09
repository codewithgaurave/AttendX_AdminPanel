import { useState, useEffect, useCallback } from 'react';

let _show;
export const toast = (msg, dur = 3000, type = 'info') => _show?.(msg, dur, type);

export default function Toast() {
  const [state, setState] = useState({ msg: '', visible: false, type: 'info' });

  useEffect(() => {
    let t;
    _show = (msg, dur, type = 'info') => {
      setState({ msg, visible: true, type });
      clearTimeout(t);
      t = setTimeout(() => setState(s => ({ ...s, visible: false })), dur);
    };
  }, []);

  const getToastClass = () => {
    let baseClass = 'toast';
    if (state.visible) baseClass += ' show';
    if (state.type === 'error') baseClass += ' toast-error';
    if (state.type === 'success') baseClass += ' toast-success';
    if (state.type === 'warning') baseClass += ' toast-warning';
    return baseClass;
  };

  return (
    <div className={getToastClass()}>
      {state.type === 'error' && '❌ '}
      {state.type === 'success' && '✅ '}
      {state.type === 'warning' && '⚠️ '}
      {state.msg}
    </div>
  );
}
