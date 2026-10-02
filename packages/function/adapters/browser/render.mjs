import { rows } from "./schema.mjs";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const attrs = (obj) =>
  Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => ` ${k}="${escape(v)}"`)
    .join("");
const tag = (name, a, body = "") => `<${name}${attrs(a)}>${body}</${name}>`;
const button = (cls, label, action, id, disabled) =>
  tag(
    "button",
    {
      class: cls,
      type: "button",
      "data-action": action,
      "data-id": id,
      disabled: disabled ? "" : null,
    },
    escape(label),
  );
// Foreign presentation bridge: the same typed Component vocabulary as the DOM
// renderer. It only escapes/projections markup, no business or state rules.
export function createRenderer(App) {
function html(c) {
  switch (c.$) {
    case "components.Group":
      return tag(
        c.kind.startsWith("near-header") ? "header" : "section",
        { class: c.kind, "data-key": "group-" + c.kind },
        rows(c.children).map(html).join(""),
      );
    case "components.Text":
      return tag(
        c.kind === "card-title" ? "h2" : c.kind === "near-name" ? "h1" : "p",
        {
          class: c.kind,
          role:
            c.kind === "error"
              ? "alert"
              : c.kind === "save-status"
                ? "status"
                : null,
        },
        escape(c.value),
      );
    case "components.Bubble":
      return tag(
        "article",
        {
          class: "bubble " + c.role,
          "data-key": "message-" + c.id,
          "aria-label": c.role === "you" ? "Tú" : "Near",
        },
        escape(c.text),
      );
    case "components.Field": {
      const a = {
        class: "field " + c.kind,
        "data-field": c.kind,
        "aria-label": c.label,
        placeholder: c.placeholder,
        maxlength: c.kind === "draft" ? 2000 : 40,
      };
      return c.kind === "draft"
        ? tag("textarea", { ...a, rows: 1 }, escape(c.value))
        : `<input${attrs({ ...a, type: "text", value: c.value, autocomplete: "off", spellcheck: "false", autocapitalize: "none", enterkeyhint: "done" })}>`;
    }
    case "components.Symbol":
      if (c.visual.$ === "components.Glyph") return App["symbols.svg_drawing"](c.visual.drawing);
      if (c.visual.$ !== "components.Sprite") throw new Error("Unknown canonical Symbol representation");
      if (!c.visual.frame.asset) return tag("span", {class:"sprite-placeholder",role:"img","aria-label":"Sprite artwork not supplied"});
      return tag("span", {class:"pet-art", role:"img", "aria-label":"Animated sprite", "data-pet-id":c.visual.frame.pet_id, "data-nearling":JSON.stringify(c.visual.frame.animation), "data-pet-time":c.visual.frame.time_ms, "data-pet-reduced":JSON.stringify(c.visual.frame.reduced_motion)}, tag("span",{class:"sprite-viewport",style:"width:"+c.visual.frame.width+"px;height:"+c.visual.frame.height+"px"}, tag("img",{class:"sprite-sheet",src:c.visual.frame.asset,alt:"",width:c.visual.frame.sheet_width,height:c.visual.frame.sheet_height,draggable:"false",style:"transform:translate(-"+c.visual.frame.x+"px,-"+c.visual.frame.y+"px)"})));
    case "components.Button":
      if (c.kind === "symbol-search" || c.kind === "symbol-telephone") return tag("button", {class:c.kind, type:"button", "data-action":c.action, "aria-label":c.label}, App["symbols.svg"]({$:c.kind === "symbol-search" ? "symbols.Search" : "symbols.Telephone"}));
      return c.kind === "send"
        ? tag(
            "button",
            {
              class: "send",
              type: "button",
              "data-action": c.action,
              "data-id": c.id,
              "aria-label": c.label,
              disabled: c.disabled ? "" : null,
            },
            App["symbols.svg"]({$: "symbols.Send"}),
          )
        : button(c.kind, c.label, c.action, c.id, c.disabled);
    case "components.Person":
      return tag(
        "button",
        {
          class: "person",
          type: "button",
          "data-action": "share",
          "data-id": c.id,
          "data-key": "person-" + c.id,
        },
        escape(c.username) +
          '<span class="person-status">Acceso pendiente</span><span class="person-action">Ver acceso</span>',
      );
    case "components.TaskRow":
      return tag(
        "button",
        {
          class: "task-row" + (c.done ? " done" : ""),
          type: "button",
          "data-action": "toggle",
          "data-id": c.id,
          "data-key": "task-" + c.id,
          "aria-pressed": String(c.done),
          "aria-label": c.title,
        },
        tag("span", { class: "check" }, c.done ? "✓" : "") +
          tag("span", { class: "task-title" }, escape(c.title)) +
          tag("span", { class: "task-status" }, c.done ? "Lista" : "Pendiente"),
      );
    default:
      throw new Error("Unknown typed Component");
  }
}

return html;
}
