import path from "path";
import fs from "fs";
import { tokenize } from "./token/tokenizer.js";
import { TokenType } from "./token/tokentypes.js";
import { applySimpleTransformToToken } from "./transform/transformer.js";

const compiledResultHeader =
`//Compiled by the compiler which compiled this file
import { validateIsOf } from "file://C:\\\\Gists\\\\EPQ-FutureProgrammingLanguages\\\\NewLang\\\\usage\\\\pjs-lib\\\\Types.js";`;

function compileTokens(tokens) {
    var result = [];
    for (var token of tokens) {
        applySimpleTransformToToken(token);
        result.push(token.content || "");
        if (token.inner) {
            result = [...result, ...compileTokens(token.inner)];
        }
    }
    return result;
}

export async function compile(inFileName, outFileName, compilerInfo, term, hasOutput) {
    var inText = fs.readFileSync(inFileName).toString();
    var tokenized = tokenize(inText);
    if (hasOutput) term.grey("| ").white("📖 Parsed file ").green("successfully\n");

    var out = compiledResultHeader + compileTokens(tokenized).join(" ");
    fs.mkdirSync(path.dirname(outFileName), { recursive: true });
    fs.writeFileSync(outFileName, out);
}