import { themeConfig } from './themeConfig.mjs';

// Helper function to extract theme from name
function getThemeFromName(name) {
  return name.includes('light') ? 'light' : 'dark';
}

// Helper function to extract and trim selector and property from name
function getSelectorProperty(name) {
  // Split by '::property' to get selector and property parts
  let [selectorPart, propertyName] = name.split('::property');
  if (!propertyName) return [null, null];

  // Remove 'selector(' from the start and ')' from the end of the selector part
  const selector = selectorPart.replace(/^selector\(|\)$/g, '').trim();

  // Remove leading and trailing brackets from the property part
  const property = propertyName.replace(/^\(|\)$/g, '').trim();
  
  return [selector, property];
}

// Helper function to determine the best category based on keyword token matches
function determineCategory(propertyName) {
  const categoryScores = {};
  const tokens = propertyName.split(/[\s\-_:]+/).map(token => token.toLowerCase());

  Object.keys(themeConfig).forEach(category => {
    categoryScores[category] = 0;
  });

  Object.keys(themeConfig).forEach(category => {
    const { keywords } = themeConfig[category];
    keywords.forEach(keyword => {
      const keywordTokens = keyword.split(/[\s\-_:]+/).map(token => token.toLowerCase());
      keywordTokens.forEach(keywordToken => {
        if (tokens.includes(keywordToken)) {
          categoryScores[category]++;
        }
      });
    });
  });

  const bestCategory = Object.keys(categoryScores).reduce((maxCat, cat) => 
    categoryScores[cat] > (categoryScores[maxCat] || 0) ? cat : maxCat, 
    'unknown'
  );

  return bestCategory;
}

// The main getThemeData function
export function getThemeData(form) {
  const elements = form.querySelectorAll('[name]');
  const propertyMap = new Map();

  elements.forEach(element => {
    const name = element.name;
    const [selector, property] = getSelectorProperty(name);
    const theme = getThemeFromName(name);

    if (!property) return;

    const category = determineCategory(property);

    if (!propertyMap.has(property)) {
      propertyMap.set(property, {
        category,
        min: null,
        max: null,
        members: []
      });
    }

    // Extract min and max from element attributes
    const minAttr = element.getAttribute('data-min');
    const maxAttr = element.getAttribute('data-max');
    const step = parseFloat(element.getAttribute('data-step')) || 1;

    const minValue = minAttr ? parseFloat(minAttr) : null;
    const maxValue = maxAttr ? parseFloat(maxAttr) : null;

    const propData = propertyMap.get(property);
    propData.members.push({
      selector,
      theme,
      value: element.value
    });

    if (minValue !== null && (propData.min === null || minValue < propData.min)) {
      propData.min = minValue;
    }

    if (maxValue !== null && (propData.max === null || maxValue > propData.max)) {
      propData.max = maxValue;
    }
  });

  const themeData = {};
  propertyMap.forEach((data, property) => {
    themeData[property] = {
      category: data.category,
      min: data.min,
      max: data.max,
      members: data.members
    };
  });

  return themeData;
}

// Function to set theme data to the form
export function setThemeData(form, themeData) {
  Object.entries(themeData).forEach(([property, data]) => {
    data.members.forEach(member => {
      const name = `selector(${member.selector})::property(${property})`;
      try {
        // Find the element by its name attribute
        const element = form.querySelector(`[name="${name}"]`);
        if (element) {
          element.value = member.value;
        } else {
          console.warn(`Element not found for name: ${name}`);
        }
      } catch (error) {
        console.error(`Failed to set theme data for name: ${name}`, error);
      }
    });
  });
}
