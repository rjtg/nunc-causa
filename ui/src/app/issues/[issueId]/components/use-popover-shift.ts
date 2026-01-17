"use client";

import { useLayoutEffect, useState } from "react";

const calcPopoverShift = (element: HTMLElement | null) => {
  if (!element) {
    return 0;
  }
  const rect = element.getBoundingClientRect();
  const padding = 12;
  let shift = 0;
  if (rect.left < padding) {
    shift = padding - rect.left;
  } else if (rect.right > window.innerWidth - padding) {
    shift = window.innerWidth - padding - rect.right;
  }
  return shift;
};

export const usePopoverShift = (openId: string | null, dataAttribute: string) => {
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    if (!openId) {
      setShift(0);
      return;
    }
    const selector = `[${dataAttribute}="${openId}"]`;
    const element = document.querySelector(selector) as HTMLElement | null;
    setShift(calcPopoverShift(element));
  }, [openId, dataAttribute]);

  return shift;
};
