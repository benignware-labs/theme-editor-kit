function observe(selector, addedCallback, removedCallback) {
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

const units = {
  'rem': { min: 0, max: 10, step: 0.05, base: 16 },
  'px': { min: 0, max: 100, step: 1 },
  'em': { min: 0, max: 5, step: 0.25 },
  '%': { min: 0, max: 100, step: 1 },
  'vh': { min: 0, max: 100, step: 1 },
  'vw': { min: 0, max: 100, step: 1 },
  'pt': { min: 0, max: 100, step: 1 }
};

const sanitizePropertyValue = (value) => {
  if (value.startsWith('#')) {
    if (value.length === 4) {
      const [, r, g, b] = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
      value = `#${r}${r}${g}${g}${b}${b}`;
    }
  }
  return value;
};

// Utility function to convert units dynamically
function convertUnits(value, fromUnit, toUnit) {
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

function extractUnit(value) {
  if (typeof value !== 'string') return '';
  if (value.match(/#[0-9a-fA-F]{3,6}/)) return '';

  const match = value.match(/[a-zA-Z%]+$/);
  return match ? match[0] : '';
}

function isValidCssColor(value) {
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

function isValidCssValue(value) {
  if (!value) return false;
  return /^(\d+(\.\d+)?)(px|em|rem|%|vh|vw|pt|cm|mm|in|pc)?$/.test(value);
}

const renderStylesheetToCssText = (stylesheet) => {
  // Initialize a variable to store the CSS text
  let cssText = '';

  // Iterate over the cssRules and concatenate their cssText
  for (let rule of stylesheet.cssRules) {
    cssText += `${rule.cssText}\n`;
  }

  // Return the concatenated CSS text
  return cssText;
};

const minimizeCss = (cssText) => {
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

const SYNC_SELECTOR = '[data-sync]';
const SOURCE_SELECTOR = '[name^="selector("]';

function validateInput(element, valueAsNumber, syncProps = null) {
  if (!Reflect.has(element, 'validity')) {
    return true;
  }

  element.setCustomValidity('');

  const { min, max, minUnit, maxUnit, feedbackElements = [] } = syncProps || getSyncProps(element);

  const value = element.value;

  let isValid = true;
  let invalidFeedback = '';
  let type = element.dataset.type;

  if (!type) {
    type = element.tagName.toLowerCase() === 'input' ? element.type : element.tagName.toLowerCase();
  }

  if (element.required && !element.value) {
    isValid = false;
    invalidFeedback = 'This field is required';
  }

  if (isValid) {
    const value = element.value;
    
    if (type === 'color') {
      isValid = isValidCssColor(value);
      invalidFeedback = 'Please select a valid color';
    }
    
    if (type === 'number') {
      isValid = isValidCssValue(value);
      invalidFeedback = 'Please enter a valid CSS value';
    } 
  }

  if (isValid) {
    valueAsNumber = typeof valueAsNumber !== 'undefined'
      ? valueAsNumber
      : Reflect.has(element, 'valueAsNumber')
        ? element.valueAsNumber
        : !isNaN(parseFloat(value))
          ? parseFloat(value)
          : undefined;

    if (!isNaN(valueAsNumber) && valueAsNumber !== undefined) {
      if (min !== undefined && valueAsNumber < min) {
        isValid = false;
        invalidFeedback = `Value must be greater than or equal to ${min}${minUnit || ''}`;
      }
      
      if (max !== undefined && valueAsNumber > max) {
        isValid = false;
        invalidFeedback = `Value must be less than or equal to ${max}${maxUnit || ''}`;
      }
    }
  }

  const syncGroup = getSyncGroup(element);

  if (feedbackElements) {
    feedbackElements.forEach(feedbackElement => {
      feedbackElement.style.display = isValid ? 'none' : 'block';
      feedbackElement.classList.toggle('is-invalid', !isValid);
      feedbackElement.innerHTML = invalidFeedback;
    });
  }


  syncGroup
    .forEach(el => {
      if (Reflect.has(el, 'validity')) {
        if (!isValid) {
          el.classList.add('is-invalid');
          el.setCustomValidity('Invalid value');
        } else {
          el.classList.remove('is-invalid');
          el.setCustomValidity('');
        }
      } else if (el.dataset.type === 'invalid') ;
  });

  return isValid;
}

function getSyncGroup(element) {
  const sync = element.dataset.sync;

  if (!sync) return [element];

  return [...document.querySelectorAll(`[data-sync="${sync}"]`)];
}

function getSyncProps(element, targetUnit = null) {
  const syncGroup = getSyncGroup(element);

  let {
    unit,
    min, minAsNumber, minUnit,
    max, maxAsNumber, maxUnit,
    step, stepAsNumber, stepUnit,
    feedbackSelector,
    feedbackElements = [],
    ...props
  } = syncGroup.reduce((acc, el) => {
    const dataset = el.dataset;
    
    const valueAsNumber = !isNaN(parseFloat(el.value))
      ? parseFloat(el.value)
      : acc.valueAsNumber;

    const unit = dataset.unit || extractUnit(el.value) || acc.unit;

    const minAsNumber = dataset.min !== undefined && !isNaN(parseFloat(dataset.min))
        ? parseFloat(dataset.min)
        : !isNaN(parseFloat(el.min))
          ? parseFloat(el.min)
          : acc.minAsNumber;

    const minUnit = dataset.minUnit || extractUnit(dataset.min) || acc.minUnit;

    const maxAsNumber = dataset.max !== undefined && !isNaN(parseFloat(dataset.max))
      ? parseFloat(dataset.max)
      : !isNaN(parseFloat(el.max))
        ? parseFloat(el.max)
        : acc.maxAsNumber;

    const maxUnit = dataset.maxUnit || extractUnit(dataset.max) || acc.maxUnit;

    const stepAsNumber = dataset.step !== undefined && !isNaN(parseFloat(dataset.step))
      ? parseFloat(dataset.step)
      : !isNaN(parseFloat(el.step))
        ? parseFloat(el.step)
        : acc.stepAsNumber;

    const stepUnit = dataset.stepUnit || extractUnit(dataset.step) || acc.stepUnit;

    const min = typeof minAsNumber !== undefined
      ? minUnit
        ? `${minAsNumber}${minUnit}`
        : minAsNumber
      : acc.min;

    const max = typeof maxAsNumber !== undefined
      ? maxUnit
        ? `${maxAsNumber}${maxUnit}`
        : maxAsNumber
      : acc.max;

    const step = typeof stepAsNumber !== undefined
      ? stepUnit
        ? `${stepAsNumber}${stepUnit}`
        : stepAsNumber
      : acc.step;

    if (dataset.feedback) {
      acc.feedbackSelector = dataset.feedback;
    } else if (dataset.feedback === '' || dataset.type === 'feedback') {
      acc.feedbackElements = acc.feedbackElements ? [...acc.feedbackElements, el] : [el];
    }

    return {
      ...dataset,
      ...acc,
      min,
      max,
      step,
      unit,
      valueAsNumber,
      minAsNumber,
      minUnit,
      maxAsNumber,
      maxUnit,
      stepAsNumber,
      stepUnit
    };
  }, {});

  targetUnit = targetUnit || unit;

  if (targetUnit) {
    min = convertUnits(minAsNumber, minUnit, targetUnit);
    minUnit = targetUnit;
    max = convertUnits(maxAsNumber, maxUnit, targetUnit);
    maxUnit = targetUnit;
    step = convertUnits(stepAsNumber, stepUnit, targetUnit);
  }

  if (feedbackSelector) {
    feedbackElements = [...feedbackElements, ...document.querySelectorAll(feedbackSelector)];
  }

  return { ...props, feedbackSelector, feedbackElements, min, minUnit, max, maxUnit, step, unit };
}

function handleFormChange$1(e) {
  syncInputElements(e.target);
}

// Add event listeners to form elements
function handleInputChange(e) {
  syncInputElement(e.target);
}

function syncInputElements(form) {
  const syncElements = [...form.querySelectorAll(SOURCE_SELECTOR)];

  syncElements.forEach(el => {
    if (el.hasAttribute('name')) {
      syncInputElement(el);
    }
  });
}

function syncInputElement(target) {
  // const sync = target.dataset.sync;

  // if (!sync) return;
  const syncGroup = getSyncGroup(target);
  const syncElements = syncGroup.filter(el => el !== target);

  const sourceElement = syncGroup.find(el => el.hasAttribute('name')) || target;
  const isUnitSelect = target.tagName.toLowerCase() === 'select'
    && [...target.options].some(option => option.value.match(/(rem|px|em|%|vh|vw|pt)/));

  const sourceValue = typeof sourceElement.value === 'string' && !isNaN(parseFloat(sourceElement.value))
    ? parseFloat(sourceElement.value)
    : sourceElement.value;
  const sourceUnit = extractUnit(sourceElement.value);

  let unit = isUnitSelect ? target.value : extractUnit(target.value) || sourceUnit || '';
  let numericValue = target.valueAsNumber || !isNaN(parseFloat(target.value))
    ? parseFloat(target.value)
    : NaN;

  if (isUnitSelect) {
    numericValue = convertUnits(sourceValue, sourceUnit, unit);
  }

  const { min, max, step, ...syncProps } = getSyncProps(target, unit);

  syncElements.forEach(el => {
    const inputType = el.tagName.toLowerCase() === 'input' ? el.type : el.tagName.toLowerCase();
    
    switch (inputType) {
      case 'range':
      case 'number':
        el.min = min;
        el.max = max;
        el.step = step;
        el.value = String(numericValue);
        break;
      case 'text':
      case 'hidden':
        el.value = unit
          ? `${!isNaN(numericValue) ? numericValue : ''}${unit}`
          : target.value;
        break;
      case 'color':
        el.value = isValidCssColor(target.value) ? sanitizePropertyValue(target.value) : '';
        break;
      case 'select':
        const options = [...el.options];
        options.forEach(option => {
          option.selected = option.value === unit;
        });
        el.setAttribute('data-unit', unit);
        break;
    }
  });

  syncGroup.forEach(el => {
    validateInput(el, numericValue, { min, max, ...syncProps });
  });
}

function initSyncForm(form) {
  const syncElements = [...form.querySelectorAll([SOURCE_SELECTOR, SYNC_SELECTOR].join(', '))];

  syncElements
    .filter(el => el.hasAttribute('name'))
    .forEach(el => {
      syncInputElement(el);
    });

  syncElements.forEach(el => {
    el.addEventListener('change', handleInputChange);
    el.addEventListener('input', handleInputChange);
  });

  form.addEventListener('input', handleFormChange$1);
  form.addEventListener('change', handleFormChange$1);
}

// suggest.mjs

class Suggest {
  constructor(inputElement, options = {}) {
    // Ensure inputElement is a valid HTML element
    if (!(inputElement instanceof HTMLElement)) {
      throw new TypeError('inputElement must be an HTML element');
    }

    

    this.inputElement = inputElement;
    this.options = {
      ...options,
      ...inputElement.dataset
    };

    this.dropdownClass = this.options.dropdownClass || 'menu';
    this.dropdownItemClass = this.options.dropdownItemClass || 'menu-item';
    this.dropdownItemActiveClass = this.options.dropdownItemActiveClass || 'active';

    // Extract options
    this.data = options.data || [];
    this.onSelect = options.onSelect || (() => {});

    // Initialize properties
    this.selectedOption = '';
    this.userInteraction = false; // Flag to track user interaction

    // Bind methods
    this.populateDropdown = this.populateDropdown.bind(this);
    this.selectOption = this.selectOption.bind(this);
    this.highlightSelectedOption = this.highlightSelectedOption.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleProgrammaticInput = this.handleProgrammaticInput.bind(this);
    this.onFocus = this.onFocus.bind(this);
    this.onBlur = this.onBlur.bind(this);

    // Initialize the component
    this.initialize();
  }

  initialize() {
    // Check if a template ID is provided for dropdown and items
    this.dropdownTemplateId = this.options.dropdownTemplateId || this.inputElement.dataset.suggestDropdownTemplate;
    this.itemTemplateId = this.options.itemTemplateId || this.inputElement.dataset.suggestItemTemplate;

    // Create dropdown from template if provided
    if (this.dropdownTemplateId) {
      const dropdownTemplate = document.getElementById(this.dropdownTemplateId);
      if (!dropdownTemplate) {
        throw new Error('Dropdown template not found');
      }

      const importedNode = document.importNode(dropdownTemplate.content, true);
      this.dropdownElement = importedNode.querySelector(this.dropdownClass);
      if (!this.dropdownElement) {
        throw new Error('Dropdown menu not found in dropdown template');
      }

      this.inputElement.parentNode.insertBefore(this.dropdownElement, this.inputElement.nextSibling);
      
      if (this.itemTemplateId) {
        const itemTemplate = document.getElementById(this.itemTemplateId);
        if (!itemTemplate) {
          throw new Error('Item template not found');
        }
        this.itemTemplateContent = itemTemplate.content;
      }
    } else {
      // Fallback to default dropdown behavior if no template is provided
      this.dropdownElement = document.createElement('div');
      this.dropdownElement.className = this.dropdownClass;
      this.inputElement.parentNode.insertBefore(this.dropdownElement, this.inputElement.nextSibling);
    }

    this.dropdownElement.style.position = 'absolute';
    this.dropdownElement.style.top = 'auto';
    this.dropdownElement.style.display = 'none';

    this.populateDropdown();

    this.inputElement.addEventListener('focus', this.onFocus);
    this.inputElement.addEventListener('blur', this.onBlur);
    this.inputElement.addEventListener('input', this.handleInput);
    this.inputElement.addEventListener('change', this.handleChange);
  }

  get menu() {
    return this.dropdownElement.querySelector(`.${this.dropdownClass}`) || this.dropdownElement;
  } 

  get menuItems() {
    return [...this.dropdownElement.querySelectorAll(`.${this.dropdownItemClass}`)];
  }

  populateDropdown() {
    if (this.dropdownElement) {
      const menu = this.menu;

      menu.innerHTML = '';

      // Populate dropdown with all options
      this.data.forEach(option => {
        if (this.itemTemplateContent) {
          const clone = document.importNode(this.itemTemplateContent, true);
          const item = clone.querySelector(`.${this.dropdownItemClass}`);
          if (item) {
            item.textContent = option;
            item.dataset.option = option;
            item.addEventListener('click', () => this.selectOption(option));
            menu.appendChild(clone);
          }
        } else {
          // Default item rendering if no template is provided
          const item = document.createElement('a');
          item.className = this.dropdownItemClass;
          item.textContent = option;
          item.dataset.option = option;
          item.addEventListener('click', () => this.selectOption(option));
          menu.appendChild(item);
        }
      });

      this.highlightSelectedOption();
    }
  }

  selectOption(option) {
    this.selectedOption = option;
    this.inputElement.value = option;
    this.dropdownElement.style.display = 'none';
    

    // Call the onSelect callback
    if (this.onSelect) {
      this.onSelect(option);
    }

    // Fire native input and change events
    this.inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
  }

  highlightSelectedOption() {
    this.menuItems.forEach(div => {
      if (div.dataset.option === this.selectedOption) {
        div.classList.add(this.dropdownItemActiveClass);
      } else {
        div.classList.remove('active');
      }
    });
  }

  handleChange(e) {
  }

  handleInput(e) {
    const query = e.target.value.toLowerCase().trim();
    this.menuItems.forEach(div => {
      const option = div.dataset.option.toLowerCase();
      const words = option.split(/\s+/); // Split option into words
      const matches = query.length === 0 || words.some(word => word.includes(query)); // Show all if query is empty, otherwise filter

      div.style.display = matches ? 'block' : 'none';
    });
    this.highlightSelectedOption(); // Update the highlighting after filtering
  }

  handleProgrammaticInput(e) {
    // const event = new CustomEvent('optionSelected', { detail: { optionName: e.target.value } });
    // document.dispatchEvent(event);
    // Call the onSelect callback
    if (this.onSelect) {
      this.onSelect(e.target.value);
    }
  }

  onFocus(e) {
    this.inputElement.select();
    this.dropdownElement.style.display = 'block';

    // Show all items when input is focused
    this.menuItems.forEach(div => {
      div.style.display = 'block';
    });

    this.userInteraction = true;

    e.stopImmediatePropagation();
  }

  onBlur() {
    setTimeout(() => this.dropdownElement.style.display = 'none', 200);
    this.userInteraction = false;
  }

  dispose() {
    // Remove event listeners
    this.inputElement.removeEventListener('focus', this.onFocus);
    this.inputElement.removeEventListener('blur', this.onBlur);
    this.inputElement.removeEventListener('input', this.handleInput);

    // Remove dropdown element from the DOM
    if (this.dropdownElement) {
      this.dropdownElement.parentNode.removeChild(this.dropdownElement);
    }
  }
}

// List of available device fonts
const deviceFonts = [
  'Arial', 'Verdana', 'Helvetica', 'Times New Roman', 'Courier New',
  'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Impact', 'Lucida Sans'
];

// List of available Google Fonts
const googleFonts = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
  'Raleway', 'Roboto Condensed', 'Roboto Slab', 'Source Sans Pro',
  'Poppins', 'Nunito', 'Merriweather', 'Playfair Display', 'Work Sans',
  'Ubuntu', 'Dosis', 'Fira Sans', 'Cabin', 'Cabin Condensed',
];

const fontInputRegistry = {};

const handleFormChange = (event) => {
    const form = event.currentTarget;
    const fontInputs = form.querySelectorAll('[data-type="font"]');
    
    fontInputs.forEach((fontInput) => {
        const fontFamily = fontInput.value?.trim();
       
        if (fontFamily && googleFonts.includes(fontFamily)) {
            addGoogleFont(fontFamily);
        }
    });
};

const initFormFonts = (form) => {
    const fontInputs = form.querySelectorAll('[data-type="font"]');

    fontInputs.forEach((fontInput) => {
        const suggest = new Suggest(fontInput, {
            data: deviceFonts.concat(googleFonts),
        });

        fontInputRegistry[fontInput.id] = suggest;
    });

    form.addEventListener('change', handleFormChange);
};

const disposeFormFonts = (form) => {
    const fontInputs = form.querySelectorAll('[data-type="font"]');

    fontInputs.forEach((fontInput) => {
        fontInput.removeEventListener('change', handleFontChange);

        fontInputRegistry[fontInput.id].dispose();
        delete fontInputRegistry[fontInput.id];
    });
};

function generateGoogleFontUrl(fontName) {
    const formattedName = fontName.replace(/ /g, '+').replace(/[^\w+]/g, '');
    return `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;700&display=swap`;
}

function addGoogleFont(fontName) {
    const url = generateGoogleFontUrl(fontName);
    let link = document.querySelector(`link[href="${url}"]`);
    if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }
}

// Global registry to track ThemeEditor instances
const themeEditorRegistry = new Map();

class ThemeEditor {
  constructor(form) {
    this.form = form;
    this.stylesheetId = this.generateUniqueId();
    this.initializeForm();
    this.addEventListeners();

    // Register this instance
    themeEditorRegistry.set(form, this);

    initSyncForm(form);
    initFormFonts(form);
  }

  generateUniqueId() {
    return `dynamic-stylesheet-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  sanitizePropertyValue(value) {
    if (value.startsWith('#')) {
      if (value.length === 4) {
        const [, r, g, b] = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
        value = `#${r}${r}${g}${g}${b}${b}`;
      }
    }
    return value;
  }

  initializeForm() {
    this.initialValues = this.getInitialValues();

    for (const [name, value] of Object.entries(this.initialValues)) {
      const element = this.form.elements[name];
      if (!element || !element.tagName) continue;

      if (element.tagName.toLowerCase() === 'select') {
        const options = [...element.options];
        options.forEach(option => {
          option.selected = option.value === value;
        });
      } else if (element.type === 'radio' || element.type === 'checkbox') {
        element.checked = element.value === value;
      } else {
        element.value = value;
      }
    }

    const formData = new FormData(this.form);
    this.updateAttributes(formData);
    this.updateVisibility();
    this.updateCodeSlot(this.updateStylesheet(formData));
  }

  normalizeSelector(selector) {
    return selector.replace(/"/g, '');
  }

  getInitialValues() {
    const initialValues = {};
    const namedElements = [...this.form.elements].filter(element => element.name);

    for (const element of namedElements) {
      const name = element.name;
      let [selector, propertyName] = name.split('::property');
      if (!propertyName) continue;

      const trimmedPropertyName = propertyName.replace(/^\(|\)$/g, '').trim();
      selector = selector.replace(/^selector\(/, '').replace(/\)$/, '').trim();
      selector = this.normalizeSelector(selector);
      const elementSelectors = selector.split(',').map(part => part.trim());

      [...document.styleSheets].forEach(styleSheet => {
        [...styleSheet.cssRules].forEach(rule => {
          if (!rule.selectorText) return;

          const ruleSelectors = rule.selectorText.split(',').map(part => this.normalizeSelector(part).trim());
          const matchingSelectors = elementSelectors.filter(elementSelector => ruleSelectors.includes(elementSelector));
          if (matchingSelectors.length === 0) return;

          const properties = Object.fromEntries(
            rule.cssText.split('{')[1].split('}')[0].trim().split(';')
            .map(property => property.trim())
            .filter(property => property)
            .map(property => ([property.split(':')[0].trim(), property.split(':')[1].trim()]))
          );

          if (properties[trimmedPropertyName]) {
            let value = properties[trimmedPropertyName];
            value = this.sanitizePropertyValue(value);
            initialValues[name] = value;
          }
        });
      });
    }

    return initialValues;
  }

  updateStylesheet(formData) {
    let stylesheetContent = '';
    const propertiesBySelector = {};

    formData.forEach((value, name) => {
      const formElement = this.form.elements[name];
      if (!formElement) return;

      const isValid = !formElement.validity || formElement.validity.valid;

      if (name.includes('::property')) {
        const [selector, propertyName] = name.split('::property');
        const trimmedSelector = selector.replace(/^selector\(/, '').replace(/\)$/, '').trim();
        const trimmedPropertyName = propertyName.replace(/^\(|\)$/g, '').trim();

        if (isValid && this.initialValues[name] !== value) {
          if (!propertiesBySelector[trimmedSelector]) {
            propertiesBySelector[trimmedSelector] = [];
          }

          propertiesBySelector[trimmedSelector].push(`${trimmedPropertyName}: ${value}`);
        }
      }
    });

    for (const [selector, properties] of Object.entries(propertiesBySelector)) {
      stylesheetContent += `${selector} {\n`;
      stylesheetContent += `    ${properties.join(';\n    ')};\n`;
      stylesheetContent += `}\n`;
    }

    let styleSheet = document.getElementById(this.stylesheetId);

    if (!styleSheet) {
      styleSheet = document.createElement('style');
      styleSheet.id = this.stylesheetId;
      document.body.appendChild(styleSheet);
    }

    styleSheet.textContent = stylesheetContent;
    return stylesheetContent;
  }

  updateAttributes(formData) {
    formData.forEach((value, name) => {
      if (name.includes('::attribute')) {
        const [selector, attributeName] = name.split('::attribute');
        const trimmedSelector = selector.replace(/^selector\(/, '').replace(/\)$/, '').trim();
        const trimmedAttributeName = attributeName.replace(/^\(|\)$/g, '').trim();

        const elements = document.querySelectorAll(trimmedSelector);

        elements.forEach(element => {
          if (element.getAttribute(trimmedAttributeName) !== value) {
            element.setAttribute(trimmedAttributeName, value);
          }
        });
      }
    });
  }

  updateCodeSlot(code) {
    const codeSlots = [...document.querySelectorAll('[data-theme-editor-code]')]
      .filter(slot => this.form.matches(slot.dataset.themeEditorCode));
    
    const assets = [...document.querySelectorAll('[data-theme-editor-asset]')].map(element => {
      const inline = element.getAttribute('data-theme-editor-asset') || !!element.textContent;

      if (inline) {
        const code = element.sheet
          ? renderStylesheetToCssText(element.sheet)
          : element.textContent;

        return minimizeCss(code);
      } else {
        const url = new URL(element.getAttribute('href'), document.baseURI).href;

        if (url) {
          return `@import url('${url}');\n`;
        }
      }

      return '';
    });

    code = assets.length && code.trim() ? '\n\n' + code : code;
    code = [...assets, code].join('\n');
    
    codeSlots.forEach(codeSlot => {
      
      const tagName = codeSlot.tagName.toLowerCase();
      
      if (tagName === 'pre' || tagName === 'code') {
        codeSlot.textContent = code;
      } else if (tagName === 'textarea') {
        codeSlot.value = code;
      } else {
        codeSlot.innerHTML = code;
      }
    });
  }

  handleFormChange() {
    const formData = new FormData(this.form);
    const stylesheetContent = this.updateStylesheet(formData);
    this.updateAttributes(formData);
    this.updateVisibility();

    // Update any output elements with the new stylesheet content
    // [...document.querySelectorAll('[data-theme-editor-output]')]
    //   .filter(target => this.form.matches(target.dataset.themeEditorOutput))
    //   .forEach(target => {
    //     target.value = stylesheetContent;
    //   });

    this.updateCodeSlot(stylesheetContent);
  }

  updateVisibility() {
    const elements = document.querySelectorAll('[data-hidden-if]');
    elements.forEach(element => {
      const selector = element.getAttribute('data-hidden-if');
      const isVisible = document.querySelector(selector) === null;
      element.hidden = isVisible;
    });
  }

  addEventListeners() {
    this.handleFormInput = () => this.handleFormChange();
    this.form.addEventListener('input', this.handleFormInput);
    this.form.addEventListener('change', this.handleFormInput);

    this.copyButton = document.querySelector('[data-copy]');
    if (this.copyButton) {
      this.handleCopyButtonClick = () => {
        const textarea = document.querySelector('[data-output]');
        if (textarea) {
          textarea.select();
          document.execCommand('copy');
          alert('Stylesheet copied to clipboard!');
        }
      };
      this.copyButton.addEventListener('click', this.handleCopyButtonClick);
    }
  }

  removeEventListeners() {
    if (this.form) {
      this.form.removeEventListener('input', this.handleFormInput);
      this.form.removeEventListener('change', this.handleFormInput);
    }

    if (this.copyButton) {
      this.copyButton.removeEventListener('click', this.handleCopyButtonClick);
    }
  }

  dispose() {
    disposeSyncForms(this.form);
    disposeFormFonts(this.form);

    this.removeEventListeners();
    
    // Remove the dynamically created stylesheet
    const styleSheet = document.getElementById(this.stylesheetId);
    if (styleSheet) {
      styleSheet.remove();
    }
    
    // Deregister this instance
    themeEditorRegistry.delete(this.form);

    // Clear references for garbage collection
    this.form = null;
    this.copyButton = null;
    this.stylesheetId = null;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-theme-editor]');

  forms.forEach(form => {
    new ThemeEditor(form);
  });

  observe(
    'form[data-theme-editor]',
    (addedNode) => {
      new ThemeEditor(addedNode);
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
