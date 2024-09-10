import {
  convertUnits,
  sanitizePropertyValue,
  isValidCssColor,
  isValidCssValue,
  extractUnit,
} from './cssUtils.mjs';

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
      } else if (el.dataset.type === 'invalid') {
        // el.innerHTML = invalidFeedback;
      }
  });

  return isValid;
}

export function getSyncGroup(element) {
  const sync = element.dataset.sync;

  if (!sync) return [element];

  return [...document.querySelectorAll(`[data-sync="${sync}"]`)];
}

export function getSyncProps(element, targetUnit = null) {
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

function handleFormChange(e) {
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

export function initSyncForm(form) {
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

  form.addEventListener('input', handleFormChange);
  form.addEventListener('change', handleFormChange);
}

export function disposeSyncForm(form) {
  const syncElements = form.querySelectorAll('[data-sync]');

  syncElements.forEach(el => {
    el.removeEventListener('change', handleInputChange);
    el.removeEventListener('input', handleInputChange);
  });

  form.removeEventListener('input', handleFormChange);
  form.removeEventListener('change', handleFormChange);
}
