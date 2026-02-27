//#region \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

//#endregion
//#region packages/pkg-esm/index.js
async function run() {
	const utils = await import("./utils-DHebi9xQ.js");
	console.log("[pkg-esm]", utils.greet(), utils.VALUE);
}

//#endregion
//#region packages/pkg-shared/utils.cjs
var require_utils = /* @__PURE__ */ __commonJSMin(((exports) => {
	exports.VALUE = 42;
	exports.greet = function greet() {
		return "hello from CJS";
	};
}));

//#endregion
//#region packages/pkg-cjs/index.js
var require_pkg_cjs = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const utils = require_utils();
	module.exports.run = function run() {
		console.log("[pkg-cjs]", utils.greet(), utils.VALUE);
	};
}));

//#endregion
//#region src/entry-min.js
var import_pkg_cjs = require_pkg_cjs();
await run();
(0, import_pkg_cjs.run)();

//#endregion
export {  };