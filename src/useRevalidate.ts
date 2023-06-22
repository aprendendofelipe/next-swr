import { useContext, useEffect, useState } from 'react';
import { RevalidateContext } from './Provider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type useRevalidateProps = any;

export function useRevalidate(props: useRevalidateProps) {
  const [state, setNewState] = useState(props);
  const { time = 0, times } = useContext(RevalidateContext);
  const [stateTime, setTime] = useState(time);

  useEffect(() => {
    if (time > stateTime || !time) {
      setNewState(props);
      setTime(time);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);

  function setState(newState: useRevalidateProps) {
    setTime(Date.now() - (times?.offset || 0));
    setNewState(newState);
  }

  return [state, setState];
}
