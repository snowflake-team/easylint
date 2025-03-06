export enum Framework {
    Vue = 'Vue',
    React = 'React',
    NodeJS = 'Node.js',
}

export enum Linter {
    ESLint = 'eslint',
    Prettier = 'prettier',
    StyleLint = 'stylelint',
    CommitLint = 'commitlint',
    OxLint = 'oxlint',
    LintStaged = 'lintstaged',
}

export enum StyleProcessor {
    CSS = 'css',
    SCSS = 'scss',
    LESS = 'less',
}

export enum ModuleType {
    ESM = 'esm',
    CJS = 'cjs',
}

export interface GenerateOptions {
    framework: Framework;
    linters: Linter[];
    moduleType: ModuleType;
    styleProcessor: StyleProcessor;
}

export interface ConfigFiles {
    [key: string]: string;
}

export interface Dependencies {
    [key: string]: string;
}
