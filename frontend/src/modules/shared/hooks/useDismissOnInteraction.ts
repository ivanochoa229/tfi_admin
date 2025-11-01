import { useEffect } from 'react';

/**
 * Dismisses transient UI feedback (alerts, toasts, confirmations) when the user
 * interacts with the document after the message is shown. Useful to close
 * success/error banners once the user continues working on the page.
 */
const useDismissOnInteraction = (isActive: boolean, dismiss: () => void) => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const handleInteraction = () => {
      dismiss();
    };

    document.addEventListener('pointerdown', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('pointerdown', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [isActive, dismiss]);
};

export default useDismissOnInteraction;