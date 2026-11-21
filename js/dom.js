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
