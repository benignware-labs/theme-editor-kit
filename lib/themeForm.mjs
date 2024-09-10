import { observe } from './domUtils.mjs';
import { ThemeEditor, themeEditorRegistry } from './ThemeEditor.mjs';

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-theme-editor]');

  forms.forEach(form => {
    new ThemeEditor(form);
  });

  observe(
    'form[data-theme-editor]',
    (addedNode) => {
      new ThemeEditor(addedNode)
    },
    (removedNode) => {
      // Find and dispose the ThemeEditor instance associated with the removed form
      const editor = themeEditorRegistry.get(removedNode);
      if (editor) {
        editor.dispose();
      }
    }
  );
  
});

