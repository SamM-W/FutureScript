import path from "path";
import fs from "fs";
import { tokenize } from "./token/tokenizer.js";
import { TokenType } from "./token/tokentypes.js";
import { applySimpleTransformToToken } from "./transform/transformer.js";
import { getReviewOfCode } from "./review/generator.js";

var compiledResultHeader;

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

export async function compile(inFileName, outFileName, compilerInfo, term, hasOutput, hasReview) {
    compiledResultHeader =
`//Compiled by the FutureScript compiler (${compilerInfo.version})
import { range, log, validateIsOf } from "file://C:\\\\Gists\\\\EPQ-FutureProgrammingLanguages\\\\NewLang\\\\library\\\\Implementations.js";\n`;

    var inText = fs.readFileSync(inFileName).toString();

    var reviewResult = null;
    if (hasReview && hasOutput) {
        term.grey("| ").white("📝 Starting code review...\n");
        reviewResult = getReviewOfCode(inText);
    }

    var tokenized = tokenize(inText);
    if (hasOutput) term.grey("| ").grey("📖 Parsed file successfully (").bold(true).blue(tokenized.tokenCount + " tokens").bold(false).grey(")\n");

    var out = compiledResultHeader + compileTokens(tokenized.tokens).join(" ");
    fs.mkdirSync(path.dirname(outFileName), { recursive: true });
    fs.writeFileSync(outFileName, out);

    if (reviewResult != null) {
        var reviewResult = await reviewResult;
        if (hasOutput) term.grey("| ").white("🔍 Review result:\n\n");
        
        //Schema
        // properties: {
        //     category: { type: "string" },
        //     message: { type: "string" },
        //     code: { type: "string" },
        //     line_number: { type: "integer" },
        // },

        if (reviewResult.length == 0) {
            term.cyan("No issues found!\n\n");
        } else {
            for (var entry of reviewResult) {
                term.cyan(entry.category).white(": " + entry.message + "\n");
                term.bold(true).grey(entry.code + "\n").bold(false);
                term.grey("(Line " + entry.line_number + ")\n\n");
            }
        }
    }
}