// ESM consumer: import() of pkg-shared/utils → resolves to utils.mjs via "default" condition
export async function run() {
  const utils = await import("pkg-shared/utils");
  console.log("[pkg-esm]", utils.greet(), utils.VALUE);
}
