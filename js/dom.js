// Small helper to build DOM elements safely.
//
//   h("h2", { class: "title" }, "Anna")  ->  <h2 class="title">Anna</h2>
//
// Text children are added as text nodes (never parsed as HTML),
// so data from the API can never inject HTML or scripts (XSS).
export function h(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (name.startsWith("on")) {
      // { onclick: fn } -> addEventListener("click", fn)
      element.addEventListener(name.slice(2), value);
    } else {
      element.setAttribute(name, value === true ? "" : value);
    }
  }

  // flat() lets us pass arrays of children, e.g. items.map(...)
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : String(child));
  }

  return element;
}

const SVG_NS = "http://www.w3.org/2000/svg";

// Same as h(), but for SVG elements (they need the SVG namespace).
//   svg("rect", { x: 0, y: 0, width: 50, height: 10 })
export function svg(tag, attrs = {}, ...children) {
  const element = document.createElementNS(SVG_NS, tag);

  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    element.setAttribute(name, value);
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : String(child));
  }

  return element;
}
