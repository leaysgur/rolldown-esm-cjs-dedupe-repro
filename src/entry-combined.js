// Single entry using both prettier (ESM) and prettier-plugin-svelte (CJS require inside)
import * as prettier from "prettier";
import * as sveltePlugin from "prettier-plugin-svelte";

// Format JS (uses babel plugin via ESM import internally)
const js = await prettier.format("const   x=1", { parser: "babel" });
console.log("[js]", js.trim());

// Format Svelte (uses babel plugin via CJS require from plugin-svelte)
const svelte = await prettier.format(
  "<script>const   x=1</script><p>hello</p>",
  { parser: "svelte", plugins: [sveltePlugin] },
);
console.log("[svelte]", svelte.trim());
