export function observe(selector, addedCallback, removedCallback) {
  // Create a new MutationObserver instance
  const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
          // Check if nodes were added
          if (mutation.addedNodes.length) {
              mutation.addedNodes.forEach(node => {
                  if (node.matches && node.matches(selector)) {
                      addedCallback(node);
                  }
              });
          }
          
          // Check if nodes were removed
          if (mutation.removedNodes.length) {
              mutation.removedNodes.forEach(node => {
                  if (node.matches && node.matches(selector)) {
                      removedCallback(node);
                  }
              });
          }
      });
  });

  // Start observing the document with the configured parameters
  observer.observe(document, {
      childList: true,
      subtree: true
  });
}
