const classDefinitionRegex = /^(composed )?class [a-zA-Z_][a-zA-Z_0-9]*(\(([a-zA-Z_][a-zA-Z_0-9]*(, *)?)+\))?$/;
const functionDefinitionRegex = /^((invoked[\s]+)|(function[\s]+))?([a-zA-Z_][a-zA-Z_0-9]*\.)?[a-zA-Z_][a-zA-Z_0-9]*([\n\r ]*\([\n\r ]*([a-zA-Z_][a-zA-Z_0-9]*(,?[\n\r ]*)?)*[\n\r ]*\))$/;
const functionNameRegex = /([a-zA-Z_][a-zA-Z_0-9]*\.)?[a-zA-Z_][a-zA-Z_0-9]* *(?=\()/;

export function removeComments(fileContent) {
    var result = "";
    var inLength = fileContent.length;

    var isInLineComment = false;
    var isInMultilineComment = false;
    var multilineQuote = false;

    for (var i = 0; i < inLength; i++) {
        var char = fileContent[i];
        var nextChar = fileContent[i+1];

        if (!isInLineComment && !isInMultilineComment && fileContent[i] == "`" && fileContent[i-1] != "\\") multilineQuote = !multilineQuote;
        if (multilineQuote) {
            result += char;
            continue;
        }

        if (nextChar != undefined) {
            var pair = char + nextChar;
            if (!isInLineComment && !isInMultilineComment) {
                if (pair == "//") {
                    isInLineComment = true;
                } else if (pair == "/*") {
                    i ++;
                    isInMultilineComment = true;
                }
            } else {
                if (pair == "*/") {
                    isInMultilineComment = false;
                    i ++;
                    continue;
                }
            }
        }
        if (isInLineComment && char == "\n") {
            isInLineComment = false;
            continue;
        }

        if (!isInLineComment && !isInMultilineComment) {
            result += char;
        }
    }
    return result;
}

export function parseCodeBlock(codeBlockContent) {
    var instructions = [];
    var currentInstruction = "";
    var currentPreBlock = "";
    var multilineQuote = false;
    for (var i = 0; i < codeBlockContent.length; i++) {
        currentInstruction += codeBlockContent[i];
        if (codeBlockContent[i] == "`" && codeBlockContent[i-1] != "\\") multilineQuote = !multilineQuote;
        if (multilineQuote) continue;
        if (codeBlockContent[i] == ";") {
            instructions.push({type: "instruction", value: currentInstruction.trim()});
            currentInstruction = "";
        }
        if (codeBlockContent[i] == "{") {
            currentPreBlock = currentInstruction.substring(0, currentInstruction.length-1);
            var name = functionNameRegex.exec(currentPreBlock.trim());
            if (name != null && ["while", "for", "if", "else"].indexOf(name[0].trim()) != -1) continue;
            var depth = 1;
            for (var j = i+1; j < codeBlockContent.length; j++) {
                i = j;
                if (codeBlockContent.length - 1 == j) throw "Code block didnt end '" + currentInstruction + "'";

                if (codeBlockContent[i] == "{") {depth++;}
                else if (codeBlockContent[i] == "}") {depth--;}

                currentInstruction += codeBlockContent[i];

                if (depth == 0) {
                    var header = currentPreBlock.trim();
                    var inner = currentInstruction.substring(currentPreBlock.length +1, currentInstruction.length -1);
                    if (classDefinitionRegex.test(header)) {
                        instructions.push({
                            type: "class",
                            header: header,
                            content: parseCodeBlock(inner)
                        });
                        currentInstruction = "";
                    } else if (functionDefinitionRegex.test(header)) {
                        instructions.push({
                            type: "function",
                            header: header,
                            content: parseCodeBlock(inner)
                        });
                        currentInstruction = "";
                    }
                    break;
                }
            }
        }
    }
    if (currentInstruction.trim() != "") {
        instructions.push({type: "instruction", value: currentInstruction.trim()});
        currentInstruction = "";
    }
    return instructions;
}