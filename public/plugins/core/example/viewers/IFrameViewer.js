function getComputedBackgroundColor(element) {
    let bgColor = window.getComputedStyle(element).backgroundColor;

    while (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
        element = element.parentElement;

        if (!element) {
            return null;
        }

        bgColor = window.getComputedStyle(element).backgroundColor;
    }

    return bgColor;
}

class IFrameViewer extends HTMLElement {
    constructor() {
        super(); 
        this.attachShadow({ mode: 'open' });
        this.iframe = null;
        this.handleResize = this.handleResize.bind(this); // Bind the handleResize function
        this.observer = null;  // MutationObserver instance
    }

    connectedCallback() {
        this.iframe = document.createElement('iframe');
        this.iframe.style.width = '100%';
        this.iframe.style.height = '0px';
        this.iframe.style.border = 'none';
        this.iframe.style.background = 'transparent';
        this.iframe.style.overflow = 'hidden';

        const headSlot = document.createElement('slot');
        headSlot.name = 'head';
        const bodySlot = document.createElement('slot');
        bodySlot.name = 'body';

        this.shadowRoot.appendChild(headSlot);
        this.shadowRoot.appendChild(bodySlot);

        this.addEventListeners();
    }

    addEventListeners() {
        this.shadowRoot.querySelectorAll('slot').forEach(slot => {
            slot.addEventListener('slotchange', () => {
                this.update();
            });
        });

        this.iframe.addEventListener('load', () => {
            this.adjustIframeHeight();
            this.observeIFrameContent();  // Start observing changes when the iframe loads
        });

        window.addEventListener('resize', this.handleResize); // Handle window resize
    }

    handleResize() {
        this.adjustIframeHeight(); // Adjust iframe height when window is resized
    }

    observeIFrameContent() {
        if (!this.iframe.contentWindow) return;

        const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
        if (!iframeDocument) return;

        // Disconnect any existing observer to prevent duplicate observers
        if (this.observer) {
            this.observer.disconnect();
        }

        // Create and start a new observer
        this.observer = new MutationObserver(() => {
            this.adjustIframeHeight(); // Adjust height on any detected mutation
        });

        // Observe changes in the entire document, including styles and child elements
        this.observer.observe(iframeDocument.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,  // Observe attribute changes, including styles
        });
    }

    update() {
        if (!this.iframe) return;

        const headContent = this.querySelector('template[slot="head"]');
        const bodyContent = this.querySelector('template[slot="body"]');

        const headHTML = headContent ? headContent.innerHTML : '';
        const bodyHTML = bodyContent ? bodyContent.innerHTML : '';

        const backgroundColor = getComputedBackgroundColor(this);

        const includeStyles = this.hasAttribute('include-styles');

        const bodyAttributes = includeStyles ? [...document.body.attributes] : [];

        let hostStyles = '';

        if (includeStyles) {
            hostStyles += Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => el.outerHTML).join('\n');
        }

        const srcdocContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <style>
                    body {
                        background: ${backgroundColor};
                    }
                </style>
                ${hostStyles}
                ${headHTML}
            </head>
            <body ${bodyAttributes.map(attr => `${attr.name}="${attr.value}"`).join(' ')}>
                ${bodyHTML}
            </body>
            </html>
        `;

        this.iframe.srcdoc = srcdocContent;

        if (!this.shadowRoot.contains(this.iframe)) {
            this.shadowRoot.appendChild(this.iframe);
        }
    }

    adjustIframeHeight() {
        this.iframe.style.height = '0px';

        if (this.iframe && this.iframe.contentWindow) {
            try {
                const iframeDocument = this.iframe.contentDocument || this.iframe.contentWindow.document;
                if (iframeDocument) {
                    const body = iframeDocument.body;
                    const html = iframeDocument.documentElement;

                    const height = Math.max(
                        body.scrollHeight, body.offsetHeight, 
                        html.clientHeight, html.scrollHeight, html.offsetHeight
                    );

                    this.iframe.style.height = `${height}px`;
                }
            } catch (e) {
                console.error('Failed to adjust iframe height:', e);
            }
        }
    }

    disconnectedCallback() {
        window.removeEventListener('resize', this.handleResize);

        if (this.observer) {
            this.observer.disconnect(); // Stop observing when the element is disconnected
        }
    }
}

customElements.define('iframe-viewer', IFrameViewer);
