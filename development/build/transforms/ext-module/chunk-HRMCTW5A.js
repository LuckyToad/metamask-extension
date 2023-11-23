"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }// src/transforms/utils.ts
var TAB = "    ";
async function lintTransformedFile(eslintInstance, content, filePath) {
  const lintResult = (await eslintInstance.lintText(content, { filePath, warnIgnored: false }))[0];
  if (lintResult === void 0) {
    throw new Error(
      `MetaMask build: Transformed file "${filePath}" appears to be ignored by ESLint.`
    );
  }
  if (lintResult.errorCount === 0) {
    return;
  }
  const errorsString = lintResult.messages.filter(({ severity }) => severity === 2).reduce((allErrors, { message, ruleId }) => {
    return allErrors.concat(
      `${TAB}${_nullishCoalesce(ruleId, () => ( "<Unknown rule>"))}
${TAB}${message}

`
    );
  }, "");
  throw new Error(
    `MetaMask build: Lint errors encountered for transformed file "${filePath}":

${errorsString}`
  );
}



exports.lintTransformedFile = lintTransformedFile;
//# sourceMappingURL=chunk-HRMCTW5A.js.map