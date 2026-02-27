// Both pkg-esm and pkg-cjs use pkg-shared/utils, but through different conditions
import { run as runESM } from "pkg-esm";
import { run as runCJS } from "pkg-cjs";

await runESM();
runCJS();
