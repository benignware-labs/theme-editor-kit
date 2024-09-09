(() => {
  const shadowHosts = [];

  Element.prototype.querySelector = new Proxy(Element.prototype.querySelector, {
    apply(target, thisArg, args, receiver) {
      const el = shadowHosts
        .filter(host => thisArg === host || thisArg.contains(host))
        .reduce((acc, host) => {
          return acc || host.shadowRoot.querySelector(...args);
        }, null);

      if (el) {
        return el;
      }

      return target.apply(thisArg, args, receiver);
    }
  });

  const contains = Element.prototype.contains;

  Element.prototype.contains = new Proxy(contains, {
    apply(target, thisArg, args, receiver) {
      const el = shadowHosts
        .filter(host => thisArg === host || contains.call(thisArg, host))
        .reduce((acc, host) => {
          return acc || host.shadowRoot.contains(...args);
        }, null);

      if (el) {
        return el;
      }

      return target.apply(thisArg, args, receiver);
    }
  });

  const addShadowHost = (host) => {
    shadowHosts.push(host);
  }

  const removeShadowHost = (host) => {
    shadowHosts = shadowHosts.filter((h) => h !== host);
  }

  const getDocumentProxy = (document) => {
    
    document.querySelector = new Proxy(document.querySelector, {
      apply(target, thisArg, args, receiver) {
        const el = shadowHosts.reduce((acc, host) => {
          return acc || host.shadowRoot.querySelector(...args);
        }, null);
  
        if (el) {
          return el;
        }
  
        return target.apply(thisArg, args, receiver);
      }
    });
  
    document.querySelectorAll = new Proxy(document.querySelectorAll, {
      apply(target, thisArg, args, receiver) {
        const el = shadowHosts.reduce((acc, host) => {
          return [...acc, ...host.shadowRoot.querySelectorAll(...args)];
        }, []);
  
        if (el.length) {
          return el;
        }
  
        return target.apply(thisArg, args, receiver);
      }
    });
    
    document.addEventListener = new Proxy(document.addEventListener, {
      apply(target, thisArg, args, receiver) {
        const [ type, listener, options ] = args;

        const fn = (e) => {
          const host = shadowHosts.find((host) => e.composedPath().includes(host));
  
          if (host) {
            const orig = e.composedPath()[0];
            
            e = {
              ...e,
              target: orig,
              currentTarget: orig
            }
          }
  
          listener(e);
        }
  
        return target.apply(thisArg, [ type, fn, options ], receiver);
      }
    });
  };

  globalThis.document = getDocumentProxy(globalThis.document);

  const shimCSS = (css) => {
    css = css.replaceAll(':root', ':host')
    css = css.replaceAll(/body(,[^(])?\{/g, ':host > .example-body $1 {');
  
    return css;
  };
  

  const shimStyleSheet = (styleSheet) => {
    for (let i = 0; i < styleSheet.cssRules.length; i++) {
      const rule = styleSheet.cssRules[i];
      const rules = rule.selectorText ? [rule] : rule.cssRules || [];

      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j];
        if (rule.type === CSSRule.STYLE_RULE) {
          rule.selectorText = shimCSS(rule.selectorText);
        }
      }
    }
  }
  
  class ExampleViewer extends HTMLElement {
    #styleSheets = [];
    #styleSheetLinks = [];
    #styleElements = new Set();
    #styleElementsObservers = new WeakMap();
  
    constructor() {
      super();

      this.handleStyleSheetLoaded = this.handleStyleSheetLoaded.bind(this);
      this.handleStyleMutation = this.handleStyleMutation.bind(this);
  
      this.attachShadow({ mode: "open" });

      const style = document.createElement('style');

      style.textContent = `
        :host {
          display: block;
          width: 100%;
          height: auto !important;
          /*overflow: auto;*/
          overflow: visible;
        }

        :host > .example-body {
          min-height: 0 !important;
          display: block !important;
          width: 100% !important;
        }
      `;

      this.shadowRoot.appendChild(style);
      
      addShadowHost(this);
    }

    handleStyleMutation(mutations) {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.parentNode.tagName === 'STYLE') {
              shimStyleSheet(node.parentNode.sheet);
            }
          });
        }
      });
    }

    handleStyleSheetLoaded(event) {
      for (
        let i = 0;
        i < event.currentTarget.sheet.cssRules.length;
        i++
    ) {
        if (event.currentTarget.sheet.cssRules[i].type == 5) { // type 5 is @font-face
            const split = event.currentTarget.href.split('/');
            const stylePath = split
                .slice(0, split.length - 1)
                .join('/');
            let cssText =
                event.currentTarget.sheet.cssRules[i].cssText;
            cssText = cssText.replace(
                // relative paths
                /url\s*\(\s*[\'"]?(?!((\/)|((?:https?:)?\/\/)|(?:data\:?:)))([^\'"\)]+)[\'"]?\s*\)/g,
                `url("${stylePath}/$4")`
            );

            const st = document.createElement('style');
            st.appendChild(document.createTextNode(cssText));
            document
                .getElementsByTagName('head')[0]
                .appendChild(st);
        }
      }

      this.#styleSheets.push(event.currentTarget.sheet);

      if (this.isComplete()) {
        this.completeCallback();
      }
    }

    isComplete() {
      return this.#styleSheetLinks.every((link) => link.sheet);
    }

    connectedCallback() {
      const templateSelector = this.getAttribute("template");
      const template = document.querySelector(templateSelector);
  
      if (!template) {
        console.error("Template not found", templateSelector);
        return;
      }
  
      const content = template.content.cloneNode(true);

      // const scripts = content.querySelectorAll('script');

      // scripts.forEach((script) => {
      //   this.#scripts.push(script);
      //   script.parentNode.removeChild(script);
      // });
  
      this.shadowRoot.appendChild(content);

      // const cssrefs = this.shadowRoot.querySelectorAll('link[rel="stylesheet"]');

      // console.log('CSS REFS', cssrefs);

      // cssrefs.forEach((link) => {
      //   console.log('ADD LINK', link.href);
      //   this.#styleSheetLinks.push(link);
      //   link.addEventListener('load', this.handleStyleSheetLoaded);
      // });
      this.updateContent();
    }
    
    addedStyleElement(el) {
      this.#styleElements.add(el);

      if (el.tagName === 'LINK') {
        el.addEventListener('load', this.handleStyleSheetLoaded);
      }

      if (el.tagName === 'STYLE') {
        this.#styleElementsObservers.set(el, new MutationObserver(this.handleStyleMutation));
        this.#styleElementsObservers.get(el).observe(el, { attributes: true, childList: true, subtree: true });
      }
    }

    deleteStyleElement(el) {
      this.#styleElements.delete(el);

      if (el.tagName === 'LINK') {
        el.removeEventListener('load', this.handleStyleSheetLoaded);
      }

      if (el.tagName === 'STYLE') {
        this.#styleElementsObservers.get(el).disconnect();
        this.#styleElementsObservers.delete(el);
      }
    }

    updateContent() {
      const styleElements = [...this.shadowRoot.querySelectorAll('link[rel="stylesheet"], style')];
      const addedStyleElements = Array.from(styleElements).filter((el) => !this.#styleElements.has(el));
      const removedStyleElements = Array.from(this.#styleElements).filter((el) => !styleElements.includes(el));

      addedStyleElements.forEach((el) => this.addedStyleElement(el));
      removedStyleElements.forEach((el) => this.deleteStyleElement(el));
    }

    completeCallback() {
      console.log('*** complete');
    }

    disconnectedCallback() {
      removeShadowHost(this);
    }
  }
  
  customElements.define('example-viewer', ExampleViewer);
})();