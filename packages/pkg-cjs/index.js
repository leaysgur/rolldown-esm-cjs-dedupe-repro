// CJS consumer: require() of pkg-shared/utils → resolves to utils.cjs via "require" condition
const utils = require("pkg-shared/utils");

module.exports.run = function run() {
  console.log("[pkg-cjs]", utils.greet(), utils.VALUE);
};
