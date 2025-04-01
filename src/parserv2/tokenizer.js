import { TokensBuilder } from "./tokens.js";
import { FlagType, TokenType } from "./tokentypes.js";

const INSTRUCTION_BREAK_MATCH = /^[;\n\r]+[\s]*/;

function tokenizeString(tkzr) {
    var stringChar = tkzr.consumeChar();
    var stringContents = "";
    var nextIsEscaped = false;

    while (stringChar != "") {
        var nextChar = tkzr.consumeChar();
        if (!nextIsEscaped) {
            if (/["'`]/.test(nextChar)) {
                if (stringChar == nextChar) {
                    stringChar = "";
                    continue;
                }
            }
        }
        nextIsEscaped = false;
        if (nextChar == '\\') {
            nextIsEscaped = true;
        }
        stringContents += nextChar;
    }
    tkzr.addTokenWithoutCapture(TokenType.LITERAL_STRING, stringContents);
    tkzr.trimRemaining();
}

function parseVarValueAdditional(tkzr) {
    console.log(tkzr.remainingText.substring(0, 5))
    tkzr.in()
    
    if (tkzr.test(/^\[[\s]*/)) {
        tkzr.token(TokenType.VAR_INDEX_OPEN_BRACKETS, /^\[[\s]*/)
            .in();
        tokenizeValue(tkzr)
        tkzr.token(TokenType.VAR_INDEX_CLOSE_BRACKETS, /^\][\s]*/)
            .out()
    }

    if (tkzr.test(/^\([\s]*/)) {
        tkzr.token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/)
        tkzr.optionalToken(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            .else(() => {
                tkzr.in()
                while (true) {
                    tokenizeValue(tkzr);
                    if (!tkzr.optionalToken(TokenType.FUNCTION_INVOKE_NEXT_ARGUMENT, /^,[\s]*/).didConsume())
                        break;
                }
                tkzr.out()
                tkzr.token(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            });
    }
    
    if (tkzr.test(/^\[[\s]*/)) {
        tkzr.token(TokenType.VAR_INDEX_OPEN_BRACKETS, /^\[[\s]*/)
            .in();
        tokenizeValue(tkzr)
        tkzr.token(TokenType.VAR_INDEX_CLOSE_BRACKETS, /^\][\s]*/)
            .out()
    }

    if (tkzr.test(/^\.[\s]*/)) {
        tkzr.token(TokenType.VAR_PROPERTY, /^\.[\s]*/)
            .token(TokenType.VAR_VALUE, /^[_a-zA-Z0-9]+[\s]*/)
        parseVarValueAdditional(tkzr);
    }
    tkzr.out();
}

function tokenizeNonStringValueOrThrow(tkzr) {
    tkzr.optionalToken(TokenType.NEGATIVE, /^\-[\s]*/);
    tkzr.optionalToken(TokenType.TYPEOF, /^typeof[\s]*/);
    tkzr
        .optionalToken(TokenType.LITERAL_NUMBER, /^[0-9.]+[\s]*/)
        .elseOptionalToken(TokenType.LAMBDA_FUNCTION_HEADER, /^\s*\(\s*[0-9a-zA-Z]+\s*(,\s*[0-9a-zA-Z]+\s*)*\)\s*=>\s*/, () => {
            tkzr.token(TokenType.FUNCTION_OPEN_BLOCK, /^\{[\s]*/)
                .in()
                .addTokenContextFlag(FlagType.IN_FUNCTION_DEFINITION);

            while (!tkzr.test(/^\}[\s]*/)) {
                tokenizeInstruction(tkzr);
            }

            tkzr.out()
                .token(TokenType.FUNCTION_CLOSE_BLOCK, /^\}[\s]*/);
        })
        .elseOptionalToken(TokenType.VALUE_OPEN_BRACKETS, /^\([\s]*/, () => {
            tkzr.in()

            tokenizeValue(tkzr)

            tkzr.out().token(TokenType.VALUE_CLOSE_BRACKETS, /^\)[\s]*/)
        })
        .elseOptionalToken(TokenType.VAR_VALUE, /^[_a-zA-Z0-9]+[\s]*/, () => parseVarValueAdditional(tkzr))
        .elseOptionalToken(TokenType.ARRAY_OPEN_BRACKETS, /^\[[\s]*/, () => {
            tkzr.in()
            tkzr.optionalToken(TokenType.ARRAY_CLOSE_BRACKETS, /^\][\s]*/)
                .else(() => {
                    while (true) {
                        tokenizeValue(tkzr);
                        if (!tkzr.optionalToken(TokenType.ARRAY_NEXT_VALUE, /^,/).didConsume())
                            break;
                    }
                    tkzr.token(TokenType.ARRAY_CLOSE_BRACKETS, /^\][\s]*/)
                });
            tkzr.out();
        })
        .elseThrow("Unknown value");
}

function tokenizeOperatorOrInstructionBreak(tkzr) {
    if (tkzr.test(INSTRUCTION_BREAK_MATCH)) {
        return false;
    }

    return tkzr
        .optionalToken(TokenType.SINGLE_OPERATOR, /^[\+\-\*\/%][\s]*/)
        .elseOptionalToken(TokenType.DOUBLE_OPERATOR, /^(==|&&|\|\||!=|<=|>=)[\s]*/)
        .didConsume();
}

function tokenizeValue(tkzr) {
    if (tkzr.test(/^["'`]/))
        tokenizeString(tkzr);
    else
        tokenizeNonStringValueOrThrow(tkzr);
    if (tokenizeOperatorOrInstructionBreak(tkzr))
        tokenizeValue(tkzr);
}

function tokenizeInstruction(tkzr) {
    tkzr
        //Variable def
        .optionalToken(TokenType.VAR_DEF, /^(var|const|let)[\s]+/, () => {
            tkzr.in()
                .token(TokenType.VAR_NAME, /^[_a-zA-Z0-9]+[\s]+/)
                .token(TokenType.VAR_EQUALS, /^=[\s]+/)
                .metaToken(TokenType.ARGUMENT_VALUE)
                .in();
            tokenizeValue(tkzr);
            tkzr.out()
                .out();
        })

        //Variable def
        .elseOptionalToken(TokenType.VAR_ASSIGN, /^[_a-zA-Z0-9]+([\s]*\.[\s]*[_a-zA-Z0-9]+[\s]*)*[\s]*(?=([\+\-\*\/])?=)/, () => {
            tkzr.in()
                .token(TokenType.VAR_ASSIGN_EQUALS, /^([\+\-\*\/])?=[\s]*/)
                .metaToken(TokenType.ARGUMENT_VALUE)
                .in();
            tokenizeValue(tkzr);
            tkzr.out()
                .out();
        })


        //Function invoke
        .elseOptionalToken(TokenType.FUNCTION_INVOKE, /^[_a-zA-Z0-9]+([\s]*\.[\s]*[_a-zA-Z0-9]+[\s]*)*[\s]*(?=\()/, () => {
            tkzr.in()
                .token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/)
            tkzr.optionalToken(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
                .else(() => {
                    tkzr.in()
                    while (true) {
                        tokenizeValue(tkzr);
                        if (!tkzr.optionalToken(TokenType.FUNCTION_INVOKE_NEXT_ARGUMENT, /^,/).didConsume())
                            break;
                    }
                    tkzr.out()
                    tkzr.token(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
                });
            tkzr.out();
        })

        //Function
        .elseOptionalFlaggedToken(FlagType.IN_FUNCTION_DEFINITION, TokenType.FUNCTION_RETURN, /^return[\s]*/, () => {
            tkzr.in()
            if (!tkzr.test(/^[\s]*[;}]/)) {
                tokenizeValue(tkzr);
            }
            tkzr.out()
        })
        .elseOptionalToken(TokenType.FUNCTION_DEFINITION, /^(async)?[\s]*function[\s]+[_a-zA-Z0-9]*[\s]*(?=\()/, () => {
            parseFunctionBody();
        })
        
        .elseOptionalFlaggedToken(FlagType.IN_CLASS_DEFINITION, TokenType.FUNCTION_DEFINITION, /^(async)?[\s]*[\s]+[_a-zA-Z0-9]*[\s]*(?=\()/, () => {
            parseFunctionBody();
        })

        .elseOptionalToken(TokenType.CLASS_DEFINITION, /^(export)?[\s]*class[\s]+[_a-zA-Z0-9]*[\s]*{/, () => {
            tkzr.in()
                .addTokenContextFlag(FlagType.IN_CLASS_DEFINITION);

            while (!tkzr.test(/^\}[\s]*/)) {
                tokenizeInstruction(tkzr);
            }

            tkzr.out()
                .token(TokenType.CLASS_DEFINITION_END, /^\}[\s]*/)
                .out();
        })

        .elseThrow("Unknown identifier of instruction");

    tkzr.optionalToken(TokenType.INSTRUCTION_BREAK, INSTRUCTION_BREAK_MATCH).else(() => {
        tkzr.metaToken(TokenType.INSTRUCTION_BREAK)
    });

    function parseFunctionBody() {
        tkzr.in()
            .token(TokenType.FUNCTION_OPEN_BRACKETS, /^\([\s]*/);

        if (!tkzr.test(/^\)/))
            while (true) {
                tkzr.token(TokenType.FUNCTION_ARGUMENT_NAME, /^[a-zA-Z][_a-zA-Z0-9]*[\s]*/);
                if (!tkzr.optionalToken(TokenType.FUNCTION_DEFINE_NEXT_ARGUMENT, /^,/).didConsume())
                    break;
            }

        tkzr.token(TokenType.FUNCTION_CLOSE_BRACKETS, /^\)[\s]*/)
            .token(TokenType.FUNCTION_OPEN_BLOCK, /^\{[\s]*/)
            .in()
            .addTokenContextFlag(FlagType.IN_FUNCTION_DEFINITION);

        while (!tkzr.test(/^\}[\s]*/)) {
            tokenizeInstruction(tkzr);
        }

        tkzr.out()
            .token(TokenType.FUNCTION_CLOSE_BLOCK, /^\}[\s]*/)
            .out();
    }
}

export function tokenize(text) {
    var tkzr = new TokensBuilder(text);

    var i = 0;

    while (!tkzr.isEmpty() && i < 50) {
        var startTokensLength = tkzr.tokens.length;
        tokenizeInstruction(tkzr);
        if (tkzr.tokens.length == startTokensLength) {
            console.log("Got stuck :( '" + tkzr.remainingText + "'");
            break;
        }
        i++;
    }

    for (var token of tkzr.tokens) {
        console.log(token.toString() + '\n');
    }
}