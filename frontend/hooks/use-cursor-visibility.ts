'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/react';
import { useWindowSize } from '@/hooks/use-window-size';

/**
 * Interface defining virtual keyboard state for cursor visibility calculations
 */
export interface VirtualKeyboardState {
  isOpen: boolean;
  height: number;
  viewportHeight: number;
  keyboardHeight: number;
}

/**
 * Interface defining required parameters for the cursor visibility hook
 */
export interface CursorVisibilityOptions {
  /**
   * The TipTap editor instance
   */
  editor: Editor | null;
  /**
   * Static overlay height in pixels (used if toolbarRef is not provided)
   */
  overlayHeight?: number;
  /**
   * Reference to the toolbar element — height is read inside effects, not during render
   */
  toolbarRef?: React.RefObject<HTMLElement | null>;
  /**
   * Reference to the element to track for cursor visibility
   */
  elementRef?: React.RefObject<HTMLElement> | null;
  /**
   * Virtual keyboard state for mobile devices
   */
  virtualKeyboard?: VirtualKeyboardState;
  /**
   * Whether to use enhanced mobile behavior
   */
  isMobile?: boolean;
}

/**
 * Simplified DOMRect type containing only the essential positioning properties
 */
export type RectState = Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>;

/**
 * Custom hook that ensures the cursor remains visible when typing in a TipTap editor.
 * Automatically scrolls the window when the cursor would be hidden by the toolbar.
 *
 * This is particularly useful for long-form content editing where the cursor
 * might move out of the visible area as the user types.
 *
 * @param options Configuration options for cursor visibility behavior
 * @returns void
 */
export function useCursorVisibility({
  editor,
  overlayHeight = 0,
  toolbarRef,
  elementRef = null,
  virtualKeyboard,
  isMobile = false,
}: CursorVisibilityOptions) {
  const { height: windowHeight } = useWindowSize();
  const [rect, setRect] = React.useState<RectState>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const updateRect = () => {
    const element = elementRef?.current ?? document.body;

    const { x, y, width, height } = element.getBoundingClientRect();
    setRect({ x, y, width, height });
  };

  React.useEffect(() => {
    const element = elementRef?.current ?? document.body;

    updateRect();

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(updateRect);
    });

    resizeObserver.observe(element);
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateRect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateRect is stable, reads elementRef
  }, [elementRef]);

  React.useEffect(() => {
    const ensureCursorVisibility = () => {
      if (!editor) return;

      const { state, view } = editor;

      if (!view.hasFocus()) return;

      // Get current cursor position coordinates
      const { from } = state.selection;
      const cursorCoords = view.coordsAtPos(from);

      if (!cursorCoords) return;

      // Calculate effective overlay height from ref or static value
      const effectiveOverlayHeight =
        toolbarRef?.current?.getBoundingClientRect().height ?? overlayHeight;

      // Calculate available viewport height
      let availableHeight = windowHeight;
      let bottomOffset = effectiveOverlayHeight;

      // Adjust for virtual keyboard on mobile
      if (isMobile && virtualKeyboard?.isOpen) {
        availableHeight = virtualKeyboard.viewportHeight;
        // Add extra padding for better UX on mobile
        bottomOffset += 20;
      }

      // Calculate cursor position relative to viewport
      const cursorFromTop = cursorCoords.top;
      const cursorFromBottom = availableHeight - cursorCoords.bottom;

      // Check if cursor is hidden by keyboard or toolbar
      const isHiddenByKeyboard =
        isMobile && virtualKeyboard?.isOpen && cursorFromBottom < bottomOffset;
      const isHiddenByToolbar = cursorFromTop < effectiveOverlayHeight;
      const isOutOfView = cursorFromTop < 0 || cursorFromBottom < bottomOffset;

      if (isHiddenByKeyboard || isHiddenByToolbar || isOutOfView) {
        let targetScrollY;

        if (isMobile && virtualKeyboard?.isOpen) {
          // On mobile with keyboard open, position cursor in the upper third of available space
          const safeArea = availableHeight - bottomOffset - effectiveOverlayHeight;
          const targetPosition = effectiveOverlayHeight + safeArea * 0.33;
          targetScrollY = window.scrollY + (cursorFromTop - targetPosition);
        } else {
          // Desktop or mobile without keyboard - position in middle of viewport
          const targetPosition = availableHeight / 2;
          targetScrollY = window.scrollY + (cursorFromTop - targetPosition);
        }

        // Ensure we don't scroll beyond document bounds
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - availableHeight);
        targetScrollY = Math.max(0, Math.min(targetScrollY, maxScrollY));

        window.scrollTo({
          top: targetScrollY,
          behavior: isMobile ? 'instant' : 'smooth', // Instant on mobile for better responsiveness
        });
      }
    };

    ensureCursorVisibility();
  }, [editor, overlayHeight, toolbarRef, windowHeight, rect.height, virtualKeyboard, isMobile]);

  return rect;
}
