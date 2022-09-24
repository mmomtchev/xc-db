"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const logo_svg_1 = __importDefault(require("./logo.svg"));
require("./App.css");
function App() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "App", children: (0, jsx_runtime_1.jsxs)("header", { className: "App-header", children: [(0, jsx_runtime_1.jsx)("img", { src: logo_svg_1.default, className: "App-logo", alt: "logo" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Edit ", (0, jsx_runtime_1.jsx)("code", { children: "src/App.tsx" }), " and save to reload."] }), (0, jsx_runtime_1.jsx)("a", { className: "App-link", href: "https://reactjs.org", target: "_blank", rel: "noopener noreferrer", children: "Learn React" })] }) }));
}
exports.default = App;
