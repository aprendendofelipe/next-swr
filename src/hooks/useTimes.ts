import { useContext } from 'react';

import { NextSwrContext } from 'src/Provider';
import { UseTimesResult } from 'src/types';

export default function useTimes(): UseTimesResult {
  const { time = 0, times } = useContext(NextSwrContext);

  return { time, ...times };
}
