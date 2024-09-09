class HostViewer extends HTMLElement {
  constructor() {
      super();
      // Create a shadow root
      this.attachShadow({ mode: 'open' });
      
      // Create a slot element
      const slot = document.createElement('slot');
      
      // Append the slot to the shadow root
      this.shadowRoot.appendChild(slot);
  }
}

// Define the custom element
customElements.define('host-viewer', HostViewer);
