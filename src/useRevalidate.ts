import { useContext, useEffect, useState } from 'react';
import { RevalidateContext } from './Provider';
import { Props, Swr } from './types';

export function useRevalidate(_props: Props, swrConfig: Swr) {
  const { swr } = _props || {};
  const [stateTime, setTime] = useState(Date.now());
  const [state, setNewState] = useState(_props);
  const swrCtx = useContext(RevalidateContext);
  const config = { ...swrCtx, ...swr, ...swrConfig } as Swr;

  useEffect(() => {
    if (config.time && config.time > stateTime) {
      setNewState(_props);
      setTime(config.time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_props]);

  function setState(newState: any) {
    setTime(Date.now() - (config.times?.offset || 0));
    setNewState(newState);
  }

  return [state, setState];
}
