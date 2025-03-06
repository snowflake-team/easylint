import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { set } from 'lodash-es';
import { Framework, Linter, ModuleType, GenerateOptions } from '../types';
import { TabWidth } from '../constants';

let packageJson = {};
const cwd = process.cwd();

// 生成 lint-staged 配置
function getLintStagedConfig(linters: Linter[]): Record<string, string[]> {
    const config: Record<string, string[]> = {};

    if (linters.includes(Linter.ESLint)) {
        config['*.{js,jsx,ts,tsx,vue}'] = ['eslint --fix'];
    }

    if (linters.includes(Linter.Prettier)) {
        config['*.{js,jsx,ts,tsx,vue,css,less,scss,html,json,md}'] = ['prettier --write'];
    }

    if (linters.includes(Linter.StyleLint)) {
        config['*.{css,less,scss,vue}'] = ['stylelint --fix'];
    }

    if (linters.includes(Linter.OxLint)) {
        config['*.{js,jsx,ts,tsx}'] = ['oxlint'];
    }

    return config;
}

// 更新 package.json
function updatePackageJson(updater: (pkg: any) => void): void {
    try {
        updater(packageJson);
    } catch (err) {
        console.error(
            chalk.red(`× Failed to update package.json: ${err instanceof Error ? err.message : String(err)}`),
        );
    }
}

// 生成 lint-staged 和 husky 配置
async function generateLintStagedConfig(options: GenerateOptions): Promise<void> {
    const { linters } = options;

    updatePackageJson((pkg) => {
        set(pkg, 'scripts.prepare', 'husky');
        set(pkg, 'lint-staged', getLintStagedConfig(linters));
    });

    await addHuskyCommand('pre-commit', 'lint-staged');

    console.log(chalk.green('✓ Generated lint-staged in package.json'));
}

// 生成 ESLint 配置
function generateESLintConfig(options: GenerateOptions): string {
    const { moduleType, framework, linters } = options;

    updatePackageJson((pkg) => {
        set(pkg, 'scripts.eslint', 'eslint --fix .');
    });

    if (moduleType === ModuleType.ESM) {
        let config = '';
        config += `import eslint from '@eslint/js';\n`;
        config += `import globals from 'globals';\n`;
        config += `import tseslint from 'typescript-eslint';\n`;

        switch (framework) {
            case Framework.Vue:
                config += `import eslintPluginVue from 'eslint-plugin-vue';\n`;
                break;
            case Framework.React:
                config += `import eslintPluginReact from 'eslint-plugin-react';\n`;
                config += `import eslintPluginReactHooks from 'eslint-plugin-react-hooks';\n`;
                break;
        }

        if (linters.includes(Linter.Prettier)) {
            config += `import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';\n`;
        }

        config += `export default tseslint.config(\n{ ignores: ['node_modules', 'dist', 'public'] },\n  eslint.configs.recommended,\n  ...tseslint.configs.recommended,\n`;

        switch (framework) {
            case Framework.Vue:
                config += `  ...eslintPluginVue.configs['flat/recommended'],\n`;
                break;
            case Framework.React:
                config += `  ...eslintPluginReact.configs.recommended,\n`;
                config += `  ...eslintPluginReactHooks.configs.recommended,\n`;
                break;
            case Framework.NodeJS:
                config += `  {\n    languageOptions: {\n      globals: {\n        ...globals.node\n      }\n    }\n  },\n`;
                break;
        }

        if (linters.includes(Linter.Prettier)) {
            config += `  eslintPluginPrettierRecommended,\n`;
        }

        config += `)\n`;
        return config;
    } else {
        let config = `const eslint = require('@eslint/js');\nconst globals = require('globals');\nconst tseslint = require('typescript-eslint');\n`;

        switch (framework) {
            case Framework.Vue:
                config += `const eslintPluginVue = require('eslint-plugin-vue');\n`;
                break;
            case Framework.React:
                config += `const eslintPluginReact = require('eslint-plugin-react');\n`;
                config += `const eslintPluginReactHooks = require('eslint-plugin-react-hooks');\n`;
                break;
        }

        if (linters.includes(Linter.Prettier)) {
            config += `const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');\n`;
        }

        config += `module.exports = tseslint.config(\n  {\n    ignores: [\n      'node_modules',\n      'dist',\n      'public',\n    ],\n  },\n  eslint.configs.recommended,\n  ...tseslint.configs.recommended,\n`;

        switch (framework) {
            case Framework.Vue:
                config += `  ...eslintPluginVue.configs['flat/recommended'],\n`;
                break;
            case Framework.React:
                config += `  ...eslintPluginReact.configs.recommended,\n`;
                config += `  ...eslintPluginReactHooks.configs.recommended,\n`;
                break;
            case Framework.NodeJS:
                config += `  {\n    languageOptions: {\n      globals: {\n        ...globals.node\n      }\n    }\n  },\n`;
                break;
        }

        if (linters.includes(Linter.Prettier)) {
            config += `  eslintPluginPrettierRecommended,\n`;
        }

        config += `)\n`;
        return config;
    }
}

// 生成 Prettier 配置
function generatePrettierConfig(options: GenerateOptions): string {
    const { moduleType } = options;

    updatePackageJson((pkg) => {
        set(pkg, 'scripts.prettier', 'prettier --write .');
    });

    const config = {
        printWidth: 120,
        tabWidth: TabWidth,
        useTabs: false,
        semi: true,
        singleQuote: true,
    };

    return moduleType === ModuleType.ESM
        ? `export default ${JSON.stringify(config, null, TabWidth)};\n`
        : `module.exports = ${JSON.stringify(config, null, TabWidth)};\n`;
}

// 生成 StyleLint 配置
function generateStyleLintConfig(options: GenerateOptions): string {
    const { styleProcessor, moduleType, framework } = options;

    updatePackageJson((pkg) => {
        set(pkg, 'scripts.stylelint', 'stylelint --fix "**/*.{css,less,scss,vue}"');
    });

    const config = {
        extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
        overrides: [],
        rules: {},
    };

    switch (styleProcessor) {
        case 'scss':
            config.extends.push('stylelint-config-recommended-scss');
            config.overrides.push({
                files: ['**/*.(css|scss|vue)'],
                customSyntax: 'postcss-scss',
            } as never);
            break;
        case 'less':
            config.extends.push('stylelint-config-recommended-less');
            config.overrides.push({
                files: ['**/*.(css|less|vue)'],
                customSyntax: 'postcss-less',
            } as never);
            break;
    }

    if (framework === Framework.Vue) {
        config.overrides.push({
            files: ['**/*.(html|vue)'],
            customSyntax: 'postcss-html',
        } as never);
    }

    return moduleType === ModuleType.ESM
        ? `export default ${JSON.stringify(config, null, TabWidth)};\n`
        : `module.exports = ${JSON.stringify(config, null, TabWidth)};\n`;
}

// 生成 CommitLint 配置
async function generateCommitLintConfig(options: GenerateOptions): Promise<string> {
    const { moduleType } = options;
    const config = {
        extends: ['@commitlint/config-conventional'],
    };

    updatePackageJson((pkg) => {
        set(pkg, 'scripts.prepare', 'husky');
    });

    await addHuskyCommand('commit-msg', 'commitlint --edit $1');

    return moduleType === ModuleType.ESM
        ? `export default ${JSON.stringify(config, null, TabWidth)};\n`
        : `module.exports = ${JSON.stringify(config, null, TabWidth)};\n`;
}

// 生成 OxLint 配置
function generateOxLintConfig(options: GenerateOptions): string {
    const { framework } = options;

    updatePackageJson((pkg) => {
        set(pkg, 'scripts.oxlint', 'oxlint .');
    });

    const config = {
        extends: ['recommended'],
        rules: {},
    };

    switch (framework) {
        case Framework.Vue:
            config.rules = {
                'suspicious/no-template-curly-in-string': 'off',
                'suspicious/no-array-access': 'off',
            };
            break;
        case Framework.React:
            config.rules = {
                'suspicious/no-jsx-spread': 'off',
                'suspicious/no-template-curly-in-string': 'off',
            };
            break;
        case Framework.NodeJS:
            config.rules = {
                'suspicious/no-process-env': 'off',
                'style/no-mixed-requires': 'off',
            };
            break;
    }

    return `${JSON.stringify(config, null, TabWidth)}\n`;
}

// 获取配置文件名
function getConfigFileName(linter: Linter): string {
    const fileNames: Record<string, string> = {
        [Linter.ESLint]: 'eslint.config.js',
        [Linter.Prettier]: 'prettier.config.js',
        [Linter.StyleLint]: 'stylelint.config.js',
        [Linter.CommitLint]: 'commitlint.config.js',
        [Linter.OxLint]: '.oxlintrc.json',
    };
    return fileNames[linter];
}

// 获取依赖列表
function getDependencies(options: GenerateOptions): string[] {
    const { linters, framework, styleProcessor } = options;
    const dependencies: string[] = [];

    if (linters.includes(Linter.ESLint)) {
        dependencies.push('eslint', '@eslint/js', 'globals', 'typescript', 'typescript-eslint');
        if (linters.includes(Linter.Prettier)) {
            dependencies.push('eslint-plugin-prettier');
        }
        switch (framework) {
            case Framework.Vue:
                dependencies.push('eslint-plugin-vue');
                break;
            case Framework.React:
                dependencies.push('eslint-plugin-react', 'eslint-plugin-react-hooks');
                break;
        }
    }

    if (linters.includes(Linter.Prettier)) {
        dependencies.push('prettier');
    }

    if (linters.includes(Linter.StyleLint)) {
        dependencies.push('stylelint', 'stylelint-config-standard', 'stylelint-config-recess-order');
        switch (styleProcessor) {
            case 'scss':
                dependencies.push('stylelint-config-recommended-scss');
                break;
            case 'less':
                dependencies.push('stylelint-config-recommended-less');
                break;
        }
    }

    if (linters.includes(Linter.CommitLint)) {
        dependencies.push('@commitlint/cli', '@commitlint/config-conventional');
    }

    if (linters.includes(Linter.OxLint)) {
        dependencies.push('oxlint');
    }

    if (linters.includes(Linter.LintStaged)) {
        dependencies.push('husky', 'lint-staged');
    }

    return dependencies;
}

// 生成配置
async function generateConfig(options: GenerateOptions): Promise<void> {
    const { linters } = options;
    const packageJsonPath = path.join(cwd, 'package.json');
    packageJson = await fs.readJSON(packageJsonPath);

    for (const linter of linters) {
        const config = await generateLinterConfig(linter, options);
        if (!config) continue;

        const configPath = path.join(cwd, getConfigFileName(linter));
        try {
            await fs.writeFile(configPath, config);
            console.log(chalk.green(`✓ Generated ${linter} config file`));
        } catch (err) {
            console.error(
                chalk.red(
                    `× Failed to generate ${linter} config file: ${err instanceof Error ? err.message : String(err)}`,
                ),
            );
        }
    }

    await fs.writeJSON(packageJsonPath, packageJson, { spaces: TabWidth });
    printDependencies(options);
}

// 生成单个 Linter 的配置
async function generateLinterConfig(linter: Linter, options: GenerateOptions): Promise<string | null> {
    switch (linter) {
        case Linter.ESLint:
            return generateESLintConfig(options);
        case Linter.Prettier:
            return generatePrettierConfig(options);
        case Linter.StyleLint:
            return generateStyleLintConfig(options);
        case Linter.CommitLint:
            return generateCommitLintConfig(options);
        case Linter.OxLint:
            return generateOxLintConfig(options);
        case Linter.LintStaged:
            await generateLintStagedConfig(options);
            return null;
        default:
            throw new Error(`Unsupported linter: ${linter}`);
    }
}

// 打印依赖列表
function printDependencies(options: GenerateOptions): void {
    const deps = getDependencies(options).join(' ');
    console.log(chalk.yellow('\nPlease run the following commands:'));
    console.log(chalk.cyan('npm run prepare'));
    console.log(chalk.cyan(`npm install -D ${deps}`));
}

async function addHuskyCommand(hook: string, command: string): Promise<void> {
    const huskyDir = path.join(cwd, '.husky');
    const preCommitPath = path.join(huskyDir, hook);
    try {
        await fs.ensureDir(huskyDir);
        await fs.writeFile(preCommitPath, `${command}\n`);
        console.log(chalk.green(`✓ Generated .husky/${hook} hook`));
    } catch (err) {
        console.error(
            chalk.red(`× Failed to generate .husky/${hook} hook: ${err instanceof Error ? err.message : String(err)}`),
        );
    }
}

export { generateConfig };
