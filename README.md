# theme-editor-kit

Utility kit for building inline css theme editor 

Looking for a way to edit and preview your theme's custom parameters with examples?
But don't want to deal with abstract and isolated config files?

Theme Editor Kit provides you with a pragamatic solution and declarative approach to theme editing. The idea is to have a sample page for our theme with the theme editor form embedded.


## Getting started

So, here's a basic example.

<!--
Example

- viewer: 'iframe'

-->

Suppose your theme has a background color, a text color and a border-color exposed as css variables. These properties are used to style your form-control as well.

```css
/* theme.css */
:root, [data-color-scheme="light"] {
  --background-color: #ffffff;
  --text-color: #000000;
  --border-color: #aaaaaa;
  --primary-color: #22bb22;
  --error-color: #ff0000;
  --primary-text-color: #ffffff;
  --font-size: 16px;
  --font-family: Arial;
  --border-width: 1px;
  --border-radius: 5px;
}

[data-color-scheme="dark"] {
  --background-color: #000000;
  --text-color: #ffffff;
  --border-color: #888888;
}

* {
  box-sizing: border-box;
}

body {
  background-color: var(--background-color);
  color: var(--text-color);
  font-size: var(--font-size);
  font-family: var(--font-family);
}

.form-control {
  background-color: var(--background-color);
  color: var(--text-color);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--border-radius);
}

.form-control:not([type="color"]):not([type="radio"]):not([type="checkbox"]) {
  padding: 0.4rem 0.6rem;
  display: block;
}

.form-control:invalid {
  border-color: var(--error-color);
}

.input-feedback {
  display: none;
  font-size: 80%;
  margin-top: 0.25rem;
}

.form-control:invalid ~ .input-feedback {
  color: var(--error-color);
  display: block;
}

.form-label {
  display: block;
  margin-bottom: .5rem;
}

.form-control + .form-label {
  display: inline-block;
  margin-left: .25rem;
  margin-bottom: 0;
  vertical-align: text-top;
}

.radio-group {
  display: inline-flex;
  gap: 1rem;
}

.radio-group [type="radio"] {
  margin: 0;
}

.input-group {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
}

.input-group .form-control {
    position: relative;
    /*flex: 1 1 auto;
    width: 1%;*/
    min-width: 0;
    height: auto;
}

.input-group .form-control:not(:first-child) {
  border-left: 0;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.input-group .form-control:not(:last-child) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.button {
  cursor: pointer;
  padding: 0.4rem 0.6rem;
}

.button-primary {
  background-color: var(--primary-color);
  color: var(--primary-text-color);
}

.modal {
  max-width: 70vw;
}

.dropdown,
.modal {
  border-style: solid;
  border-width: var(--border-width);
  border-color: var(--border-color);
  border-radius: var(--border-radius);
}

.dropdown {
  background: var(--background-color);
  overflow: auto;
  max-height: 280px;
  width: max-content;
}

.dropdown-item {
  padding: 0.4rem 0.6rem;
  display: block;
}

.dropdown-item.active {
  background-color: var(--background-color);
}

```

```html
<link rel="stylesheet" href="theme.css" data-theme-editor-asset="inline"/>
```


Now, we're going to setup our sample page with the embedded theme editor form.

We're going to have a heading and paragraph in our example.


```html
<h1>Theme Editor</h1>
<p>Generate a stylesheet for your theme</p>
```

To draw the attention to our form, we need to provide a `data-theme-editor` attribute.
We target our theme parameters by specifying a selector and the property on the name attribute of the form element. Theme Editor Kit takes care about updating the stylesheet on every form change.


Theme parameters and their scoped selectors are declared on the name attribute of the form elements, e.g. 
```html
<form id="themeEditor" data-theme-editor>
  <h4>Color Scheme</h4>
  <p>
    <label class="form-label">Color Scheme</label>
    <span class="radio-group">
      <span class="radio-item">
        <input id="theme-light" name="selector(body)::attribute(data-color-scheme)" type="radio" class="form-control" value="light" checked>
        <label for="theme-light" class="form-label">Light</label>
      </span>
      <span class="radio-item">
        <input id="theme-dark" name="selector(body)::attribute(data-color-scheme)" type="radio" class="form-control" value="dark">
        <label for="theme-dark" class="form-label">Dark</label>
      </span>
    </span>
  </p>
  <div hidden data-hidden-if="[data-color-scheme='dark']">
    <p class="mb-3">
        <label for="textColorDark" class="form-label">Body Color (Dark)</label>
        <span class="input-group">
          <input type="color" class="form-control form-control-color" data-sync="textColorDark">
          <input id="textdColorDark" name="selector([data-color-scheme=dark])::property(--text-color)" type="text" class="form-control"  data-sync="textColorDark" data-type="color">
          <div class="invalid-feedback" data-sync="textColorDark" data-type="feedback"></div>
        </span>
    </p>
    <p class="mb-3">
        <label for="backgroundColorDark" class="form-label">Body Background (Dark)</label>
        <span class="input-group">
            <input type="color" class="form-control form-control-color" data-sync="backgroundColorDark">
            <input id="backgroundColorDark" name="selector([data-color-scheme=dark])::property(--background-color)" type="text" class="form-control" data-sync="backgroundColorDark" data-type="color">
            <div class="invalid-feedback" data-sync="backgroundColorDark" data-type="feedback"></div>
        </span>
    </p>
</div>
<div hidden data-hidden-if="[data-color-scheme='light']">
    <p class="mb-3">
        <label for="body-color" class="form-label">Body Color</label>
        <span class="input-group">
            <input type="color" class="form-control form-control-color" data-sync="text-color">
            <input id="body-color" name="selector(:root, [data-color-scheme=light])::property(--text-color)" type="text" class="form-control" data-sync="text-color" data-type="color">
            <div class="invalid-feedback" data-sync="text-color" data-type="feedback"></div>
        </span>
    </p>
    <p class="mb-3">
        <label for="body-bg" class="form-label">Body Background</label>
        <span class="input-group">
            <input type="color" class="form-control form-control-color" data-sync="background-color">
            <input id="body-bg" name="selector(:root, [data-color-scheme=light])::property(--background-color)" type="text" class="form-control" data-sync="background-color" data-type="color">
            <div class="invalid-feedback" data-sync="background-color" data-type="feedback"></div>
        </span>
    </p>
</div>

<h4>Typography</h4>
  <p>
    <label class="form-label" for="fontFamily">Font Family</label>
    <!--<select class="form-control" name="selector(:root)::property(--font-family)">
      <option value="Arial">Arial</option>
      <option value="Times New Roman">Times New Roman</option>
    </select>-->
    <input
      class="form-control"
      name="selector(:root, [data-color-scheme=light])::property(--font-family)"
      data-type="font"
      data-dropdown-class="dropdown"
      data-dropdown-item-class="dropdown-item"
    />
  </p>
  <p>
    <label class="form-label" for="fontSize">Font Size</label>
    <input id="fontSize"
      class="form-control"
      name="selector(:root, [data-color-scheme=light])::property(--font-size)"
      data-type="number"
      data-min="12px"
      data-max="20px"
      data-sync="fontSize"
      data-feedback="#fontSizeFeedback"
      data-invalid-class="invalid"
    />
    <span id="fontSizeFeedback" class="input-feedback"></span>

    <!-- <input id="fontSize"
      class="form-control"
      name="selector(:root)::property(--font-size)"
      type="number"
      min="12"
      max="20"
      data-unit="px"
    /> -->
  </p>

  <h4>Theme Colors</h4>
  <p>
    <input id="primaryColor" name="selector(:root, [data-color-scheme=light])::property(--primary-color)" type="color" class="form-control" />
    <label for="primaryColor" class="form-label">Primary Color</label>
  </p>
  <p>
    <input id="errorColor" name="selector(:root, [data-color-scheme=light])::property(--error-color)" type="color" class="form-control" />
    <label for="errorColor" class="form-label">Error Color</label>
  </p>
</form>
```

Let's write the generated css to a textarea component:

```html
<dialog id="codeDialog" class="modal">
  <!-- <textarea class="form-control" style="width: 100%; min-height: 180px" data-theme-editor-code="#themeEditor"></textarea> -->
   <div style="overflow: auto; margin-bottom: 1rem">
     <pre><code data-theme-editor-code="#themeEditor"></code></pre>
   </div>
  <button id="copyCodeBtn" class="button button-primary">Copy to Clipboard</button>
  <button class="button button-secondary" onclick="document.getElementById('codeDialog').close()">Close</button>
</dialog>
<button class="button button-primary"  onclick="document.getElementById('codeDialog').showModal()">Code</button>
```