export const units = {
  'rem': { min: 0, max: 10, step: 0.05, base: 16 },
  'px': { min: 0, max: 100, step: 1 },
  'em': { min: 0, max: 5, step: 0.25 },
  '%': { min: 0, max: 100, step: 1 },
  'vh': { min: 0, max: 100, step: 1 },
  'vw': { min: 0, max: 100, step: 1 },
  'pt': { min: 0, max: 100, step: 1 }
};

export const sanitizePropertyValue = (value) => {
  if (value.startsWith('#')) {
    if (value.length === 4) {
      const [, r, g, b] = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
      value = `#${r}${r}${g}${g}${b}${b}`;
    }
  }
  return value;
};

// Utility function to convert units dynamically
export function convertUnits(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;

  const tempElement = document.createElement('div');
  document.body.appendChild(tempElement);

  const basePxSize = units['rem'] ? units['rem'].base : 16;

  if (fromUnit === 'rem') {
    tempElement.style.fontSize = `${value}rem`;
  } else if (fromUnit === 'em') {
    tempElement.style.fontSize = `${value}em`;
  } else if (fromUnit === 'px') {
    tempElement.style.fontSize = `${value}px`;
  } else if (fromUnit === '%') {
    tempElement.style.fontSize = `${value}%`;
  } else if (fromUnit === 'vh') {
    tempElement.style.height = `${value}vh`;
  } else if (fromUnit === 'vw') {
    tempElement.style.width = `${value}vw`;
  } else if (fromUnit === 'pt') {
    tempElement.style.fontSize = `${value}pt`;
  }

  const computedSize = window.getComputedStyle(tempElement).fontSize || window.getComputedStyle(tempElement).height || window.getComputedStyle(tempElement).width;
  document.body.removeChild(tempElement);

  const computedSizeNumeric = parseFloat(computedSize);

  if (toUnit === 'px') return computedSizeNumeric;
  if (toUnit === 'rem') return computedSizeNumeric / basePxSize;
  if (toUnit === 'em') {
    const parentElement = document.createElement('div');
    parentElement.style.fontSize = '1em';
    document.body.appendChild(parentElement);
    const parentSize = window.getComputedStyle(parentElement).fontSize;
    document.body.removeChild(parentElement);
    const parentSizeNumeric = parseFloat(parentSize);
    return computedSizeNumeric / parentSizeNumeric;
  }
  if (toUnit === 'vh') return computedSizeNumeric / (window.innerHeight / 100);
  if (toUnit === 'vw') return computedSizeNumeric / (window.innerWidth / 100);
  if (toUnit === 'pt') return computedSizeNumeric * 1.333;

  return value;
}

export function extractUnit(value) {
  if (typeof value !== 'string') return '';
  if (value.match(/#[0-9a-fA-F]{3,6}/)) return '';

  const match = value.match(/[a-zA-Z%]+$/);
  return match ? match[0] : '';
}

export function isValidCssColor(value) {
  // Check if value is a valid hex color (e.g., #fff, #123456)
  const hexColorPattern = /^#([0-9a-fA-F]{3}){1,2}$/;
  if (hexColorPattern.test(value)) {
    return true;
  }

  // Check if value is a valid rgb/rgba color (e.g., rgb(255, 255, 255), rgba(0, 0, 0, 0.5))
  const rgbColorPattern = /^rgb(a)?\(\s*(\d{1,3}\s*,\s*){2}\d{1,3}\s*(,\s*(0?\.\d+|1(\.0+)?))?\s*\)$/;
  if (rgbColorPattern.test(value)) {
    const [_, a, r, g, b, alpha] = value.match(/rgb(a)?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0?\.\d+|1(\.0+)?))?\s*\)/);
    if (a === undefined || alpha === undefined || (parseFloat(alpha) >= 0 && parseFloat(alpha) <= 1)) {
      return true;
    }
  }

  // Check if value is a valid named color (e.g., "black", "white")
  const colorNames = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'gray', 'grey',
    'silver', 'maroon', 'olive', 'purple', 'teal', 'navy', 'aqua', 'fuchsia', 'lime', 'orange'
  ];

  if (colorNames.includes(value.toLowerCase())) {
    return true;
  }

  return false;
}

export function isValidCssValue(value) {
  if (!value) return false;
  return /^(\d+(\.\d+)?)(px|em|rem|%|vh|vw|pt|cm|mm|in|pc)?$/.test(value);
}

export const renderStylesheetToCssText = (stylesheet) => {
  // Initialize a variable to store the CSS text
  let cssText = '';

  // Iterate over the cssRules and concatenate their cssText
  for (let rule of stylesheet.cssRules) {
    cssText += `${rule.cssText}\n`;
  }

  // Return the concatenated CSS text
  return cssText;
};

export const minimizeCss = (cssText) => {
  return cssText
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove whitespace around symbols
    .replace(/\s*([{}:;,])\s*/g, '$1')
    // Remove trailing semicolons within blocks
    .replace(/;}/g, '}')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    // Trim the entire string
    .trim();
};
