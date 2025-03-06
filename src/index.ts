import inquirer from 'inquirer';
import { generateConfig } from './utils/generate';
import { Framework, Linter, ModuleType, GenerateOptions } from './types';

async function init(): Promise<void> {
    let answers = {} as GenerateOptions;
    const questions = [
        {
            type: 'list',
            name: 'framework',
            message: 'Select your framework:',
            choices: [
                { name: 'Node.JS', value: Framework.NodeJS },
                { name: 'React', value: Framework.React },
                { name: 'Vue', value: Framework.Vue },
            ],
        },
        {
            type: 'checkbox',
            name: 'linters',
            message: 'Select linting tools:',
            choices: [
                { name: 'ESLint', value: Linter.ESLint },
                { name: 'Prettier', value: Linter.Prettier },
                { name: 'StyleLint', value: Linter.StyleLint },
                { name: 'CommitLint', value: Linter.CommitLint },
                { name: 'OxLint', value: Linter.OxLint },
                { name: 'Lint-staged', value: Linter.LintStaged },
            ],
        },
        {
            type: 'list',
            name: 'moduleType',
            message: 'Select module type:',
            choices: [
                { name: 'ESM (ECMAScript Modules)', value: ModuleType.ESM },
                { name: 'CJS (CommonJS)', value: ModuleType.CJS },
            ],
        },
    ];
    const linterAnswers = await inquirer.prompt(questions);
    answers = Object.assign(answers, linterAnswers);

    if (answers.linters.includes(Linter.StyleLint)) {
        const styleProcessorQuestion = [
            {
                type: 'list',
                name: 'styleProcessor',
                message: 'Select style processor:',
                choices: [
                    { name: 'CSS', value: 'css' },
                    { name: 'SCSS', value: 'scss' },
                    { name: 'LESS', value: 'less' },
                ],
            },
        ];
        const styleProcessorAnswers = await inquirer.prompt(styleProcessorQuestion);
        answers = Object.assign(answers, styleProcessorAnswers);
    }

    await generateConfig(answers);
}

init().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
