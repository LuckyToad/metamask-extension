import type { ESLint } from 'eslint';
/**
 * Lints a transformed file by invoking ESLint programmatically on the string
 * file contents. The path to the file must be specified so that the repository
 * ESLint config can be applied properly.
 *
 * **ATTN:** See the `eslintInstance` parameter documentation for important usage
 * information.
 *
 * An error is thrown if linting produced any errors, or if the file is ignored
 * by ESLint. Files linted by this function must not be ignored by ESLint.
 *
 * @param eslintInstance - The ESLint instance to use for linting. This instance
 * needs to be initialized with the options `{ baseConfig, useEslintrc: false}`,
 * where `baseConfig` is the desired ESLint configuration for linting. If using
 * your project's regular `.eslintrc` file, you may need to modify certain rules
 * for linting to pass after code fences are removed.
 * @param content - The file content.
 * @param filePath - The path to the file.
 * @returns Returns `undefined` or throws an error if linting produced
 * any errors, or if the linted file is ignored.
 */
export declare function lintTransformedFile(eslintInstance: ESLint, content: string, filePath: string): Promise<void>;
//# sourceMappingURL=utils.d.ts.map