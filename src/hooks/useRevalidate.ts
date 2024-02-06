import { useContext, useEffect, useRef, useState } from 'react';

import { NextSwrContext } from 'src/Provider';
import { Props, UseRevalidateResult } from 'src/types';

export default function useRevalidate(props: Props): UseRevalidateResult {
  const [state, setNewState] = useState<Props>(props);
  const { time = 0, times } = useContext(NextSwrContext);
  const timeRef = useRef(time);

  useEffect(() => {
    if (time > timeRef.current || !time) {
      setNewState(props);
      timeRef.current = time;
    }
  }, [props, time]);

  function setState(newState: Props | ((lastState: Props) => Props)) {
    timeRef.current = Date.now() - (times?.offset || 0);
    setNewState(newState);
  }

  return [state, setState];
}
