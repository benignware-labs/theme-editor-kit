// suggest.mjs

export default class Suggest {
  constructor(inputElement, options = {}) {
    // Ensure inputElement is a valid HTML element
    if (!(inputElement instanceof HTMLElement)) {
      throw new TypeError('inputElement must be an HTML element');
    }

    this.inputElement = inputElement;
    this.options = options;

    this.dropdownClass = options.dropdownClass || 'menu';
    this.dropdownItemClass = options.dropdownItemClass || 'menu-item';
    this.dropdownItemActiveClass = options.dropdownItemActiveClass || 'active';

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

    console.log('selectOption', option);

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
    console.log('handleChange', e.target.value);
  }

  handleInput(e) {
    console.log('handleInput', e.target.value);
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
    console.log('handleProgrammaticInput', e.target.value);
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
