import { observe } from './domUtils.mjs';
import { ThemeEditor, themeEditorRegistry } from './ThemeEditor.mjs';

console.log('Theme form module loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed', document);
  const forms = document.querySelectorAll('form[data-theme-editor]');

  console.log('Theme forms:', forms);

  forms.forEach(form => {
    new ThemeEditor(form);
  });

  observe(
    'form[data-theme-editor]',
    (addedNode) => {
      console.log('Form added:', addedNode);
      new ThemeEditor(addedNode)
    },
    (removedNode) => {
      // Find and dispose the ThemeEditor instance associated with the removed form
      const editor = themeEditorRegistry.get(removedNode);
      if (editor) {
        editor.dispose();
      }
      console.log('Form removed and disposed:', removedNode);
    }
  );
  
});

